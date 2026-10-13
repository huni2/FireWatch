package com.firewatch.backend.web.dto

data class GoogleLinkRequest(val idToken: String, val recordChoice: AccountRecordChoice? = null)

data class AccountRecordChoice(val mode: String, val cashSource: String = "ACCOUNT", val fingerprint: String)
