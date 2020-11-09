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

use crate::message::Message;
use crate::storage_api::*;

use fluence::fce;

pub const SUCCESS_CODE: i32 = 0;

#[fce]
pub struct AddServiceResult {
    pub ret_code: i32,
    pub err_msg: String,
    pub msg_id: i64,
}

#[fce]
fn add(author: String, msg: String, reply_to: i64) -> AddServiceResult {
    add_msg(msg, author, reply_to).into()
}

#[fce]
pub struct GetAllServiceResult {
    pub ret_code: i32,
    pub err_msg: String,
    pub messages: Vec<Message>,
}

#[fce]
fn get_all() -> GetAllServiceResult {
    get_all_msgs().into()
}

#[fce]
pub struct GetLastServiceResult {
    pub ret_code: i32,
    pub err_msg: String,
    pub last_message: String,
}

#[fce]
fn get_last(last: i64) -> GetLastServiceResult {
    get_msg(last).into()
}
