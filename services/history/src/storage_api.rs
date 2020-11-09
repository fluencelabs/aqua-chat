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
use crate::Result;

use fce_sqlite_connector::Connection;
use fce_sqlite_connector::Value;
use fce_sqlite_connector::Value::Integer as VInteger;
use fce_sqlite_connector::Value::String as VString;

use once_cell::sync::Lazy;

static SQLITE: Lazy<Connection> = Lazy::new(|| Connection::open(":memory:").unwrap());

fn value_to_string(value: &Value) -> Result<String> {
    use crate::errors::HistoryError::UnexpectedValueType;

    value
        .as_string()
        .ok_or_else(|| UnexpectedValueType(value.clone(), "string"))
        .map(Into::into)
}

fn value_to_integer(value: &Value) -> Result<i64> {
    use crate::errors::HistoryError::UnexpectedValueType;

    value
        .as_integer()
        .ok_or_else(|| UnexpectedValueType(value.clone(), "integer"))
        .map(Into::into)
}

pub fn init() -> Result<()> {
    let init_sql = "CREATE TABLE IF NOT EXISTS history(\
        msg_id INTEGER PRIMARY KEY,\
        msg TEXT NOT NULL,\
        author TEXT NOT NULL,\
        reply_to INTEGER\
    );";

    SQLITE.execute(init_sql).map_err(Into::into)
}

pub fn add_msg(msg: String, author: String, reply_to: i64) -> Result<i64> {
    use crate::errors::HistoryError::InternalError;

    let add_msg_sql = "INSERT INTO history (msg, author, reply_to) VALUES (?, ?, ?)";
    let mut cursor = SQLITE.prepare(add_msg_sql)?.cursor();
    cursor.bind(&[VString(msg), VString(author), VInteger(reply_to)])?;
    cursor.next()?;

    let last_rowid_sql = "SELECT last_insert_rowid()";
    let mut cursor = SQLITE.prepare(last_rowid_sql)?.cursor();
    let raw_id = cursor
        .next()?
        .ok_or_else(|| InternalError(String::from("last_insert_rowid didn't return any value")))?
        .first()
        .unwrap();

    value_to_integer(raw_id)
}

pub fn get_msg(limit: i64) -> Result<String> {
    let get_msg_sql = "SELECT * FROM history ORDER BY msg_id DESC LIMIT ?";

    let mut cursor = SQLITE.prepare(get_msg_sql)?.cursor();
    cursor.bind(&[VInteger(limit)])?;

    let raw_msg = match cursor.next()? {
        Some(values) => values,
        None => return Ok(String::new()),
    };

    value_to_string(raw_msg.first().unwrap())
}

pub fn get_all_msgs() -> Result<Vec<Message>> {
    use crate::errors::HistoryError::CorruptedMessage;
    use crate::message::MESSAGE_FIELDS_COUNT;

    let get_all_msgs_sql = "SELECT * FROM history";
    let mut get_all_msgs_cursor = SQLITE.prepare(get_all_msgs_sql)?.cursor();

    let mut messages = Vec::new();
    while let Some(raw_message) = get_all_msgs_cursor.next()? {
        if raw_message.len() != MESSAGE_FIELDS_COUNT {
            return Err(CorruptedMessage(raw_message.into()));
        }

        let message = Message {
            id: value_to_integer(&raw_message[0])?,
            author: value_to_string(&raw_message[2])?,
            body: value_to_string(&raw_message[1])?,
            reply_to: value_to_integer(&raw_message[3])?,
        };

        messages.push(message);
    }

    Ok(messages)
}
