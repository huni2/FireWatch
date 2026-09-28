package com.firewatch.backend.repository

import com.firewatch.backend.entity.AppUser
import org.springframework.data.jpa.repository.JpaRepository

interface AppUserRepository : JpaRepository<AppUser, Long> {
    fun findByGoogleSub(googleSub: String): AppUser?
}
