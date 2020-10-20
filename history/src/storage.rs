/*
 * Copyright 2020 Fluence Labs Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

use fluence::fce;

#[fce]
pub struct Message {
    pub id: u32,
    pub author: String,
    pub body: String,
}

pub fn init() {
    unsafe {
        invoke("CREATE TABLE IF NOT EXISTS history(msg_id INTEGER PRIMARY KEY, msg TEXT NOT NULL, author TEXT NOT NULL);".to_string());
    }
}

pub fn add_msg(msg: String, author: String) -> String {
    unsafe {
        invoke(format!(
            "INSERT INTO history (msg,author) VALUES ('{}','{}')",
            msg, author
        ))
    }
}

pub fn get_msg(limit: u64) -> String {
    unsafe {
        invoke(format!(
            "SELECT * FROM history ORDER BY msg_id DESC LIMIT '{}';",
            limit
        ))
    }
}

pub fn get_all_msgs() -> Vec<Message> {
    let msgs = unsafe { invoke(format!("SELECT * FROM history;")) };
    msgs.split("|").filter_map(|msg| {
        let mut columns = msg.split(",");
        let mut next = |field| columns.next().map(|s| s.to_string()).or_else(|| {
            log::warn!("message {} is corrupted, missing field {}", msg, field);
            None
        });
        let id = next("id")?;
        let id = match id.parse::<u32>() {
            Ok(id) => id,
            Err(err) => {
                log::warn!("message.id isn't a number {}: {:?}", id, err);
                u32::max_value()
            }
        };
        Some(Message {
            id,
            author: next("author")?,
            body: next("body")?
        })
    }).collect()
}

#[fce]
#[link(wasm_import_module = "sqlite")]
extern "C" {
    #[link_name = "invoke"]
    pub fn invoke(cmd: String) -> String;

}
