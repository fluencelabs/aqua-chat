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

use crate::user::User;
use crate::Result;

use fce_sqlite_connector::Connection;
use fce_sqlite_connector::Value;
use fce_sqlite_connector::Value::String as VString;

use once_cell::sync::Lazy;

static SQLITE: Lazy<Connection> = Lazy::new(|| Connection::open(":memory:").unwrap());

macro_rules! non_return_sql {
    ($SQLITE:expr, $sql:expr, $bind_values:expr) => {{
        let mut cursor = $SQLITE.prepare($sql)?.cursor();
        cursor.bind($bind_values)?;
        cursor.next().map(|_| ()).map_err(Into::into)
    }};
}

pub fn init() -> Result<()> {
    let init_sql = "CREATE TABLE IF NOT EXISTS users(\
        peer_id TEXT PRIMARY KEY,\
        relay TEXT NOT NULL,\
        sig TEXT NOT NULL,\
        name TEXT NOT NULL\
    );";

    SQLITE.execute(init_sql).map_err(Into::into)
}

pub fn user_exists(user_name: String) -> Result<bool> {
    let prepare_sql = "SELECT * FROM users WHERE peer_id = ?";
    let mut cursor = SQLITE.prepare(prepare_sql)?.cursor();
    cursor.bind(&[VString(user_name)])?;

    let user = cursor.next()?;
    Ok(user.is_some())
}

pub fn update_name(name: String, peer_id: String) -> Result<()> {
    let update_name_sql = "UPDATE users SET name = ? WHERE peer_id = ?";
    non_return_sql!(SQLITE, update_name_sql, &[VString(name), VString(peer_id)])
}

pub fn update_relay(peer_id: String, relay: String, signature: String) -> Result<()> {
    let update_relay_sql = "UPDATE users SET relay = ?, sig = ? WHERE peer_id = ?";
    non_return_sql!(
        SQLITE,
        update_relay_sql,
        &[VString(relay), VString(signature), VString(peer_id)]
    )
}

pub fn get_all_users() -> Result<Vec<User>> {
    use crate::errors::UserListError::CorruptedUser;
    use crate::user::USER_FIELDS_COUNT;

    fn value_to_string(value: &Value) -> Result<String> {
        use crate::errors::UserListError::UnexpectedValueType;

        value
            .as_string()
            .ok_or_else(|| UnexpectedValueType(value.clone(), "string"))
            .map(Into::into)
    }

    let get_all_users_sql = "SELECT * FROM users";
    let mut get_all_users_cursor = SQLITE.prepare(get_all_users_sql)?.cursor();

    let mut users = Vec::new();
    while let Some(raw_user) = get_all_users_cursor.next()? {
        if raw_user.len() != USER_FIELDS_COUNT {
            return Err(CorruptedUser(raw_user.into()));
        }

        let user = User {
            peer_id: value_to_string(&raw_user[0])?,
            relay_id: value_to_string(&raw_user[1])?,
            signature: value_to_string(&raw_user[2])?,
            name: value_to_string(&raw_user[3])?,
        };

        users.push(user);
    }

    Ok(users)
}

pub fn add_user(user: User) -> Result<()> {
    let add_user_sql = "REPLACE INTO users (peer_id,relay,sig,name) VALUES (?, ?, ?, ?)";
    let raw_user = &[
        VString(user.peer_id),
        VString(user.relay_id),
        VString(user.signature),
        VString(user.name),
    ];
    non_return_sql!(SQLITE, add_user_sql, raw_user)
}

pub fn delete_user(peer_id: String) -> Result<()> {
    let delete_user_sql = "DELETE FROM users WHERE peer_id = ?";
    non_return_sql!(SQLITE, delete_user_sql, &[VString(peer_id),])
}
