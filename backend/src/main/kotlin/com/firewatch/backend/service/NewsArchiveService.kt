package com.firewatch.backend.service

import com.firewatch.backend.repository.CollectionRunRepository
import com.firewatch.backend.web.ValidationException
import com.firewatch.backend.web.dto.NewsArticleResponse
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Service
import java.sql.Timestamp
import java.time.LocalDate
import java.time.ZoneId

data class NewsArchiveResponse(
    val news: List<NewsArticleResponse>, val updatedAt: java.time.Instant?,
    val page: Int, val size: Int, val total: Long, val hasMore: Boolean, val refreshMinutes: Int = 30,
)

/** Search the retained RSS feed AND historical briefing articles; pagination never deletes old rows. */
@Service
class NewsArchiveService(private val jdbc: NamedParameterJdbcTemplate, private val runs: CollectionRunRepository) {
    fun search(from: LocalDate?, to: LocalDate?, query: String?, page: Int, size: Int): NewsArchiveResponse {
        if (page !in 0..10000 || size !in 1..50 || (query?.length ?: 0) > 100 || (from != null && to != null && from > to)) {
            throw ValidationException("날짜 범위와 검색어·페이지를 확인해주세요.", emptyMap())
        }
        val zone = ZoneId.of("Asia/Seoul")
        val keyword = query.orEmpty().trim().lowercase().replace("!", "!!").replace("%", "!%").replace("_", "!_")
        val conditions = mutableListOf("rank_number = 1")
        val params = mutableMapOf<String, Any>("limit" to size, "offset" to page * size)
        if (from != null) { conditions += "article_date >= :from"; params["from"] = Timestamp.from(from.atStartOfDay(zone).toInstant()) }
        if (to != null) { conditions += "article_date < :until"; params["until"] = Timestamp.from(to.plusDays(1).atStartOfDay(zone).toInstant()) }
        if (keyword.isNotEmpty()) { conditions += "(LOWER(title) LIKE :keyword ESCAPE '!' OR LOWER(COALESCE(description, '')) LIKE :keyword ESCAPE '!')"; params["keyword"] = "%$keyword%" }
        val sql = """
            WITH archive AS (
                SELECT title, link, description, pub_date, COALESCE(pub_date, collected_at) AS article_date FROM news_feed
                UNION ALL
                SELECT n.title, n.link, n.description, n.pub_date, COALESCE(n.pub_date, b.created_at) AS article_date
                FROM briefing_news n JOIN briefings b ON b.id = n.briefing_id
            ), ranked AS (
                SELECT archive.*, ROW_NUMBER() OVER (PARTITION BY link ORDER BY CASE WHEN pub_date IS NULL THEN 1 ELSE 0 END, article_date ASC, title ASC) AS rank_number FROM archive
            )
        """.trimIndent()
        val where = conditions.joinToString(" AND ")
        val total = jdbc.queryForObject("$sql SELECT COUNT(*) FROM ranked WHERE $where", params, Long::class.java) ?: 0L
        val news = jdbc.query("$sql SELECT title, link, description, pub_date, article_date FROM ranked WHERE $where ORDER BY article_date DESC, link ASC LIMIT :limit OFFSET :offset", params) { rs, _ ->
            NewsArticleResponse(rs.getString("title"), rs.getString("link"), rs.getString("description"), rs.getTimestamp("pub_date")?.toInstant())
        }
        return NewsArchiveResponse(news, runs.findById("news").orElse(null)?.completedAt, page, size, total, (page.toLong() + 1) * size < total)
    }
}
