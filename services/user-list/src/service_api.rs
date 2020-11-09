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

use crate::storage_api::*;
use crate::user::User;
use crate::Result;
use fluence::fce;

const OWNER: &str = "owner_id";
pub const SUCCESS_CODE: i32 = 0;

#[fce]
pub struct GetUsersServiceResult {
    pub ret_code: i32,
    pub err_msg: String,
    pub users: Vec<User>,
}

#[fce]
fn get_users() -> GetUsersServiceResult {
    get_all_users().into()
}

#[fce]
fn get_user(peer_id: String) -> GetUsersServiceResult {
    get_user_by_peer_id(peer_id).into()
}

#[fce]
pub struct EmptyServiceResult {
    pub ret_code: i32,
    pub err_msg: String,
}

#[fce]
fn join(user: User) -> EmptyServiceResult {
    add_user(user).into()
}

#[fce]
fn delete(peer_id: String, signature: String) -> EmptyServiceResult {
    fn delete_impl(peer_id: String, signature: String) -> Result<()> {
        let owner = std::env::var(OWNER).unwrap_or_else(|_| "".to_string());
        is_authenticated(peer_id.clone(), &signature, Some(owner))?;

        delete_user(peer_id)
    };

    delete_impl(peer_id, signature).into()
}

#[fce]
pub struct ExistsServiceResult {
    pub ret_code: i32,
    pub err_msg: String,
    pub is_exists: bool,
}

#[fce]
fn is_exists(user_name: String) -> ExistsServiceResult {
    user_exists(user_name).into()
}

fn is_authenticated(user_name: String, signature: &str, owner: Option<String>) -> Result<()> {
    use crate::errors::UserListError::UserNotExist;
    use boolinator::Boolinator;

    user_exists(user_name.clone())?.ok_or_else(|| UserNotExist(user_name.clone()))?;
    match owner {
        Some(owner) => check_signature(owner, signature),
        None => check_signature(user_name, signature),
    }
}

fn check_signature(user: impl AsRef<str>, signature: impl AsRef<str>) -> Result<()> {
    use crate::errors::UserListError::InvalidSignature;
    use boolinator::Boolinator;

    let user = user.as_ref();
    let signature = signature.as_ref();
    // TODO: implement signature verification
    (user == signature).ok_or_else(|| InvalidSignature(user.to_string(), signature.to_string()))
}
