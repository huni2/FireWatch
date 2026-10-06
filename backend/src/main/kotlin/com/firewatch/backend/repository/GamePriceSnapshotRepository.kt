package com.firewatch.backend.repository

import com.firewatch.backend.entity.GamePriceSnapshot
import org.springframework.data.jpa.repository.JpaRepository

interface GamePriceSnapshotRepository : JpaRepository<GamePriceSnapshot, String>
