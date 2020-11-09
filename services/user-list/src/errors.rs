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

use crate::service_api::EmptyServiceResult;
use crate::service_api::ExistsServiceResult;
use crate::service_api::GetUsersServiceResult;
use crate::user::User;
use crate::Result;

use fce_sqlite_connector::Error as SqliteConnectorError;
use fce_sqlite_connector::Value;

use std::convert::From;
use std::error::Error;

#[derive(Debug)]
pub enum UserListError {
    SqliteConnectorError(SqliteConnectorError),
    CorruptedUser(Vec<Value>),
    UnexpectedValueType(Value, &'static str),
    InvalidSignature(String, String),
    UserNotExist(String),
}

impl Error for UserListError {}

impl std::fmt::Display for UserListError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::result::Result<(), std::fmt::Error> {
        match self {
            Self::SqliteConnectorError(err) => writeln!(f, "{:?}", err),
            Self::CorruptedUser(values) => writeln!(
                f,
                "user can't be constructed from returned values: {:?}",
                values
            ),
            Self::UnexpectedValueType(value, expected_type) => writeln!(
                f,
                "expected type {}, but value {:?} received",
                expected_type, value
            ),
            Self::InvalidSignature(user_name, signature) => writeln!(
                f,
                "invalid signature '{}' provided for user '{}'",
                signature, user_name
            ),
            Self::UserNotExist(user_name) => {
                writeln!(f, "user with name '{}' does not exist", user_name)
            }
        }
    }
}

impl From<SqliteConnectorError> for UserListError {
    fn from(err: SqliteConnectorError) -> Self {
        UserListError::SqliteConnectorError(err)
    }
}

impl From<std::convert::Infallible> for UserListError {
    fn from(_: std::convert::Infallible) -> Self {
        unreachable!()
    }
}

fn to_error_core(err: &UserListError) -> i32 {
    match err {
        UserListError::SqliteConnectorError(_) => 1,
        UserListError::CorruptedUser(_) => 2,
        UserListError::UnexpectedValueType(..) => 3,
        UserListError::InvalidSignature(..) => 4,
        UserListError::UserNotExist(_) => 5,
    }
}

impl From<Result<()>> for EmptyServiceResult {
    fn from(result: Result<()>) -> Self {
        match result {
            Ok(_) => Self {
                ret_code: crate::service_api::SUCCESS_CODE,
                err_msg: String::new(),
            },
            Err(err) => Self {
                ret_code: to_error_core(&err),
                err_msg: format!("{}", err),
            },
        }
    }
}

impl From<Result<Vec<User>>> for GetUsersServiceResult {
    fn from(result: Result<Vec<User>>) -> Self {
        match result {
            Ok(users) => Self {
                ret_code: crate::service_api::SUCCESS_CODE,
                err_msg: String::new(),
                users,
            },
            Err(err) => Self {
                ret_code: to_error_core(&err),
                err_msg: format!("{}", err),
                users: vec![],
            },
        }
    }
}

impl From<Result<bool>> for ExistsServiceResult {
    fn from(result: Result<bool>) -> Self {
        match result {
            Ok(is_exists) => Self {
                ret_code: crate::service_api::SUCCESS_CODE,
                err_msg: String::new(),
                is_exists,
            },
            Err(err) => Self {
                ret_code: to_error_core(&err),
                err_msg: format!("{}", err),
                is_exists: false,
            },
        }
    }
}
