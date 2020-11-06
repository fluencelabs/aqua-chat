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

mod storage;

use fluence::fce;
use fluence::WasmLogger;
use crate::storage::{add_msg, init, get_all_msgs, get_msg, Message};

const OWNER: &str = "OWNER";

pub fn main() {
    WasmLogger::new()
        .with_log_level(log::Level::Info)
        .with_target_map(<_>::default())
        .build()
        .unwrap();
    init();
}

#[fce]
fn add(author: String, msg: String, reply_to: u32) -> String {
    add_msg(msg, author, reply_to)
}

#[fce]
fn get_all() -> Vec<Message> {
    get_all_msgs()
}

#[fce]
fn get_last(last: u64) -> String {
    get_msg(last)
}
