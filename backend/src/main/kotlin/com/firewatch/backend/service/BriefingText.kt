package com.firewatch.backend.service

/** Notification providers display plain text, including for older stored briefings. */
internal fun briefingNotificationText(value: String): String = value
    .replace("\r\n", "\n").replace('\r', '\n')
    .replace(Regex("(?m)^[ \\t]*(```|~~~).*$"), "")
    .replace(Regex("(?m)^[ \\t]{0,3}(?:[-*_][ \\t]*){3,}$"), "")
    .replace(Regex("(?m)^[ \\t]{0,3}#{1,6}[ \\t]+(.+?)(?:[ \\t]+#+)?[ \\t]*$"), "$1")
    .replace(Regex("(?m)^[ \\t]*>[ \\t]?"), "")
    .replace(Regex("(?m)^[ \\t]*[-+*][ \\t]+"), "• ")
    .replace(Regex("!?\\[([^]]+)\\]\\([^)]+\\)"), "$1")
    .replace(Regex("\\*\\*([^*]+)\\*\\*"), "$1")
    .replace(Regex("(^|[\\s(])__([^_\\n]+)__(?=$|[\\s.,!?;)])"), "$1$2")
    .replace(Regex("\\*(\\S(?:[^*\\n]*?\\S)?)\\*"), "$1")
    .replace(Regex("(^|[\\s(])_([^_\\n]+)_(?=$|[\\s.,!?;)])"), "$1$2")
    .replace(Regex("~~([^~]+)~~"), "$1")
    .replace(Regex("`([^`]+)`"), "$1")
    .replace(Regex("\\s+"), " ").trim()
