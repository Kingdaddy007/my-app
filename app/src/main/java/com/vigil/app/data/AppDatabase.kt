package com.vigil.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.vigil.app.data.dao.ActivityDao
import com.vigil.app.data.dao.CategoryDao
import com.vigil.app.data.dao.IntervalDao
import com.vigil.app.data.dao.PriorityDao
import com.vigil.app.data.dao.SessionDao
import com.vigil.app.data.dao.SettingsDao
import com.vigil.app.data.dao.WakeMarkerDao
import com.vigil.app.data.model.ActivityEntity
import com.vigil.app.data.model.CategoryEntity
import com.vigil.app.data.model.IntervalEntity
import com.vigil.app.data.model.PriorityEntity
import com.vigil.app.data.model.SessionEntity
import com.vigil.app.data.model.SettingsEntity
import com.vigil.app.data.model.WakeMarkerEntity

@Database(
    entities = [
        CategoryEntity::class,
        ActivityEntity::class,
        SessionEntity::class,
        IntervalEntity::class,
        WakeMarkerEntity::class,
        PriorityEntity::class,
        SettingsEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun categoryDao(): CategoryDao
    abstract fun activityDao(): ActivityDao
    abstract fun sessionDao(): SessionDao
    abstract fun intervalDao(): IntervalDao
    abstract fun wakeMarkerDao(): WakeMarkerDao
    abstract fun priorityDao(): PriorityDao
    abstract fun settingsDao(): SettingsDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "vigil.db"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
