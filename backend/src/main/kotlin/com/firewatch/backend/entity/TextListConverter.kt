package com.firewatch.backend.entity

// Design Ref: §3.1 — TEXT 컬럼에 담는 문자열 리스트(키워드/추천종목/토큰)를 쉼표 구분으로 단순화해서 다룬다.
fun String?.toStringList(): List<String> =
    this?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() } ?: emptyList()

fun List<String>.toCommaSeparated(): String = joinToString(",")
