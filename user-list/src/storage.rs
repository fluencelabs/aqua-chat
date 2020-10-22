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

pub fn init() {
    unsafe {
        invoke("CREATE TABLE IF NOT EXISTS users(peer_id TEXT PRIMARY KEY, relay TEXT NOT NULL, sig TEXT NOT NULL, name TEXT NOT NULL);".to_string());
    }
    log::info!("tables created");
}

pub fn user_exists(user: &str) -> bool {
    let req = format!("SELECT * FROM users WHERE peer_id = '{}'", user);
    let result = unsafe { invoke(req) };
    log::info!("deletion result:");
    log::info!("{}", result.as_str());
    if result.is_empty() || result == "OK" {
        return false;
    }

    return true;
}

pub fn update_name(peer_id: String, name: String) -> String {
    unsafe {
        invoke(format!(
            "UPDATE users SET name = '{}' WHERE peer_id = '{}'",
            name, peer_id
        ))
    }
}

pub fn update_relay(peer_id: String, relay: String, signature: String) -> String {
    unsafe {
        invoke(format!(
            "UPDATE users SET relay = '{}', sig = '{}' WHERE peer_id = '{}'",
            relay, signature, peer_id
        ))
    }
}

pub fn get_all_users() -> String {
    unsafe { invoke(format!("SELECT * FROM users")) }
}

pub fn add_user(peer_id: String, relay: String, signature: String, name: String) -> String {
    unsafe {
        invoke(format!(
            "REPLACE INTO users (peer_id,relay,sig,name) VALUES ('{}','{}','{}','{}')",
            peer_id, relay, signature, name
        ))
    }
}

pub fn delete_user(peer_id: &str) -> String {
    unsafe { invoke(format!("DELETE FROM users WHERE peer_id = '{}';", peer_id)) }
}

#[fce]
#[link(wasm_import_module = "sqlite")]
extern "C" {
    #[link_name = "invoke"]
    pub fn invoke(cmd: String) -> String;
}
