import { integer, real, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(), email: text("email").notNull(), name: text("name"),
  role: text("role", { enum: ["user","ecologist","operator","administrator"] }).notNull().default("user"),
  language: text("language").notNull().default("ru"), theme: text("theme").notNull().default("dark"), ...timestamps,
}, t => [index("idx_users_email").on(t.email)]);

export const userCredentials = sqliteTable("user_credentials", {
  email: text("email").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  passwordSalt: text("password_salt").notNull(),
  passwordHash: text("password_hash").notNull(),
});

export const waterBodies = sqliteTable("water_bodies", {
  id:text("id").primaryKey(), name:text("name").notNull(), region:text("region").notNull(),
  kind:text("kind").notNull(), centerLat:real("center_lat"), centerLng:real("center_lng"), ...timestamps,
});
export const monitoringStations = sqliteTable("monitoring_stations", {
  id:text("id").primaryKey(), waterBodyId:text("water_body_id").notNull().references(()=>waterBodies.id),
  name:text("name").notNull(), latitude:real("latitude").notNull(), longitude:real("longitude").notNull(),
  status:text("status").notNull(), lastCalibrationAt:integer("last_calibration_at",{mode:"timestamp"}), ...timestamps,
}, t => [index("idx_stations_water_body").on(t.waterBodyId),index("idx_stations_status").on(t.status)]);
export const measurements = sqliteTable("measurements", {
  id:integer("id").primaryKey({autoIncrement:true}), stationId:text("station_id").notNull().references(()=>monitoringStations.id),
  parameter:text("parameter").notNull(), value:real("value").notNull(), unit:text("unit").notNull(),
  measuredAt:integer("measured_at",{mode:"timestamp"}).notNull(), confidence:real("confidence"),
  source:text("source",{enum:["sensor","laboratory","official_open_data","AI_prediction","demo"]}).notNull(),
  calibrationStatus:text("calibration_status").notNull(),
}, t => [index("idx_measurements_station_time").on(t.stationId,t.measuredAt)]);
export const labTests = sqliteTable("lab_tests", {
  id:text("id").primaryKey(), waterBodyId:text("water_body_id").notNull().references(()=>waterBodies.id),
  sampledAt:integer("sampled_at",{mode:"timestamp"}).notNull(), laboratory:text("laboratory").notNull(),
  resultJson:text("result_json").notNull(), verified:integer("verified",{mode:"boolean"}).notNull().default(false), ...timestamps,
});
export const robots = sqliteTable("robots", {
  id:text("id").primaryKey(), name:text("name").notNull(), status:text("status").notNull(),
  battery:integer("battery"), containerFill:integer("container_fill"), latitude:real("latitude"), longitude:real("longitude"), ...timestamps,
});
export const robotRoutes = sqliteTable("robot_routes", {
  id:text("id").primaryKey(), robotId:text("robot_id").notNull().references(()=>robots.id),
  startedAt:integer("started_at",{mode:"timestamp"}), completedAt:integer("completed_at",{mode:"timestamp"}),
  distanceKm:real("distance_km"), routeGeoJson:text("route_geo_json"), ...timestamps,
}, t=>[index("idx_routes_robot").on(t.robotId)]);
export const cleanupEvents = sqliteTable("cleanup_events", {
  id:text("id").primaryKey(), routeId:text("route_id").references(()=>robotRoutes.id), waterBodyId:text("water_body_id").references(()=>waterBodies.id),
  collectedKg:real("collected_kg").notNull(), categoriesJson:text("categories_json").notNull(),
  beforeObjectKey:text("before_object_key"), afterObjectKey:text("after_object_key"), occurredAt:integer("occurred_at",{mode:"timestamp"}).notNull(), ...timestamps,
});
export const alerts = sqliteTable("alerts", {
  id:text("id").primaryKey(), stationId:text("station_id").references(()=>monitoringStations.id),
  severity:text("severity").notNull(), title:text("title").notNull(), explanation:text("explanation"),
  modelConfidence:real("model_confidence"), status:text("status").notNull(), detectedAt:integer("detected_at",{mode:"timestamp"}).notNull(), ...timestamps,
});
export const incidents = sqliteTable("incidents", {
  id:text("id").primaryKey(), alertId:text("alert_id").references(()=>alerts.id), waterBodyId:text("water_body_id").references(()=>waterBodies.id),
  status:text("status").notNull(), assignedUserId:text("assigned_user_id").references(()=>users.id), ...timestamps,
});
export const userReports = sqliteTable("user_reports", {
  id:text("id").primaryKey(), userId:text("user_id").notNull().references(()=>users.id), category:text("category").notNull(),
  description:text("description").notNull(), latitude:real("latitude"), longitude:real("longitude"),
  observedAt:integer("observed_at",{mode:"timestamp"}).notNull(), photoObjectKey:text("photo_object_key"),
  status:text("status").notNull().default("received"), ...timestamps,
}, t=>[index("idx_reports_user").on(t.userId),index("idx_reports_status").on(t.status)]);
export const notifications = sqliteTable("notifications", {
  id:text("id").primaryKey(), userId:text("user_id").notNull().references(()=>users.id),
  type:text("type").notNull(), title:text("title").notNull(), body:text("body").notNull(),
  readAt:integer("read_at",{mode:"timestamp"}), ...timestamps,
}, t=>[index("idx_notifications_user_read").on(t.userId,t.readAt)]);
