package com.vigil.app.data.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.vigil.app.data.model.ActivityEntity
import com.vigil.app.data.model.CategoryEntity
import com.vigil.app.data.model.IntervalEntity
import com.vigil.app.data.model.PriorityEntity
import com.vigil.app.data.model.SessionEntity
import com.vigil.app.data.model.SettingsEntity
import com.vigil.app.data.model.WakeMarkerEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories ORDER BY sortOrder ASC, name ASC")
    fun getAllCategories(): Flow<List<CategoryEntity>>

    @Query("SELECT * FROM categories ORDER BY sortOrder ASC, name ASC")
    suspend fun getAllCategoriesList(): List<CategoryEntity>

    @Query("SELECT * FROM categories WHERE id = :id LIMIT 1")
    suspend fun getCategoryById(id: String): CategoryEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategory(category: CategoryEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategories(categories: List<CategoryEntity>)

    @Update
    suspend fun updateCategory(category: CategoryEntity)

    @Delete
    suspend fun deleteCategory(category: CategoryEntity)
}

@Dao
interface ActivityDao {
    @Query("SELECT * FROM activities WHERE isArchived = 0 ORDER BY isFavorite DESC, updatedAt DESC")
    fun getActiveActivities(): Flow<List<ActivityEntity>>

    @Query("SELECT * FROM activities ORDER BY isArchived ASC, isFavorite DESC, name ASC")
    fun getAllActivities(): Flow<List<ActivityEntity>>

    @Query("SELECT * FROM activities")
    suspend fun getAllActivitiesList(): List<ActivityEntity>

    @Query("SELECT * FROM activities WHERE id = :id LIMIT 1")
    suspend fun getActivityById(id: String): ActivityEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertActivity(activity: ActivityEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertActivities(activities: List<ActivityEntity>)

    @Update
    suspend fun updateActivity(activity: ActivityEntity)

    @Delete
    suspend fun deleteActivity(activity: ActivityEntity)
}

@Dao
interface SessionDao {
    @Query("SELECT * FROM sessions WHERE status IN ('running', 'paused') ORDER BY startedAt DESC LIMIT 1")
    fun getLiveSession(): Flow<SessionEntity?>

    @Query("SELECT * FROM sessions WHERE status IN ('running', 'paused') ORDER BY startedAt DESC LIMIT 1")
    suspend fun getLiveSessionImmediate(): SessionEntity?

    @Query("SELECT * FROM sessions WHERE id = :id LIMIT 1")
    suspend fun getSessionById(id: String): SessionEntity?

    @Query("SELECT * FROM sessions ORDER BY startedAt DESC")
    suspend fun getAllSessionsList(): List<SessionEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSession(session: SessionEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSessions(sessions: List<SessionEntity>)

    @Update
    suspend fun updateSession(session: SessionEntity)

    @Delete
    suspend fun deleteSession(session: SessionEntity)
}

@Dao
interface IntervalDao {
    @Query("SELECT * FROM intervals WHERE sessionId = :sessionId ORDER BY startInstant ASC")
    fun getIntervalsForSession(sessionId: String): Flow<List<IntervalEntity>>

    @Query("SELECT * FROM intervals WHERE sessionId = :sessionId ORDER BY startInstant ASC")
    suspend fun getIntervalsForSessionImmediate(sessionId: String): List<IntervalEntity>

    @Query("SELECT * FROM intervals WHERE endInstant IS NULL LIMIT 1")
    suspend fun getOpenInterval(): IntervalEntity?

    @Query("SELECT * FROM intervals WHERE (endInstant IS NULL OR endInstant >= :startRange) AND startInstant < :endRange ORDER BY startInstant ASC")
    fun getIntervalsInRange(startRange: Long, endRange: Long): Flow<List<IntervalEntity>>

    @Query("SELECT * FROM intervals WHERE (endInstant IS NULL OR endInstant >= :startRange) AND startInstant < :endRange ORDER BY startInstant ASC")
    suspend fun getIntervalsInRangeImmediate(startRange: Long, endRange: Long): List<IntervalEntity>

    @Query("SELECT * FROM intervals ORDER BY startInstant ASC")
    suspend fun getAllIntervalsList(): List<IntervalEntity>

    @Query("SELECT * FROM intervals WHERE id = :id LIMIT 1")
    suspend fun getIntervalById(id: String): IntervalEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertInterval(interval: IntervalEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertIntervals(intervals: List<IntervalEntity>)

    @Update
    suspend fun updateInterval(interval: IntervalEntity)

    @Delete
    suspend fun deleteInterval(interval: IntervalEntity)

    @Query("DELETE FROM intervals WHERE id = :id")
    suspend fun deleteIntervalById(id: String)
}

@Dao
interface WakeMarkerDao {
    @Query("SELECT * FROM wake_markers WHERE date = :date LIMIT 1")
    fun getWakeMarkerForDate(date: String): Flow<WakeMarkerEntity?>

    @Query("SELECT * FROM wake_markers WHERE date = :date LIMIT 1")
    suspend fun getWakeMarkerForDateImmediate(date: String): WakeMarkerEntity?

    @Query("SELECT * FROM wake_markers")
    suspend fun getAllWakeMarkersList(): List<WakeMarkerEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWakeMarker(marker: WakeMarkerEntity)
}

@Dao
interface PriorityDao {
    @Query("SELECT * FROM priorities WHERE localDate = :localDate ORDER BY sortOrder ASC")
    fun getPrioritiesForDate(localDate: String): Flow<List<PriorityEntity>>

    @Query("SELECT * FROM priorities WHERE localDate = :localDate ORDER BY sortOrder ASC")
    suspend fun getPrioritiesForDateImmediate(localDate: String): List<PriorityEntity>

    @Query("SELECT * FROM priorities ORDER BY localDate DESC, sortOrder ASC")
    suspend fun getAllPrioritiesList(): List<PriorityEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPriority(priority: PriorityEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPriorities(priorities: List<PriorityEntity>)

    @Update
    suspend fun updatePriority(priority: PriorityEntity)

    @Delete
    suspend fun deletePriority(priority: PriorityEntity)

    @Query("DELETE FROM priorities WHERE localDate = :localDate")
    suspend fun deletePrioritiesForDate(localDate: String)
}

@Dao
interface SettingsDao {
    @Query("SELECT * FROM settings WHERE id = 1 LIMIT 1")
    fun getSettings(): Flow<SettingsEntity?>

    @Query("SELECT * FROM settings WHERE id = 1 LIMIT 1")
    suspend fun getSettingsImmediate(): SettingsEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSettings(settings: SettingsEntity)

    @Update
    suspend fun updateSettings(settings: SettingsEntity)
}
