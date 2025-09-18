import { query, cacheGet, cacheSet } from '../config/database';

export interface Station {
  id: string;
  code: string;
  name: string;
  name_ml?: string;
  name_hi?: string;
  location: { lat: number; lng: number };
  address?: string;
  facilities: string[];
  is_active: boolean;
  order_index: number;
  created_at: Date;
  updated_at: Date;
}

export class StationModel {
  private static CACHE_KEY = 'stations:all';
  private static CACHE_TTL = 3600; // 1 hour

  static async create(stationData: {
    code: string;
    name: string;
    name_ml?: string;
    name_hi?: string;
    lat: number;
    lng: number;
    address?: string;
    facilities?: string[];
    order_index: number;
  }): Promise<Station> {
    const result = await query(
      `INSERT INTO stations (
        code, name, name_ml, name_hi, location, address, facilities, order_index
      ) VALUES ($1, $2, $3, $4, POINT($5, $6), $7, $8, $9) 
      RETURNING id, code, name, name_ml, name_hi, 
               location[0] as lat, location[1] as lng,
               address, facilities, is_active, order_index, created_at, updated_at`,
      [
        stationData.code.toUpperCase(),
        stationData.name,
        stationData.name_ml,
        stationData.name_hi,
        stationData.lng,
        stationData.lat,
        stationData.address,
        JSON.stringify(stationData.facilities || []),
        stationData.order_index
      ]
    );

    // Clear cache
    await this.clearCache();

    const station = result.rows[0];
    station.location = { lat: station.lat, lng: station.lng };
    delete station.lat;
    delete station.lng;

    return station;
  }

  static async findAll(activeOnly: boolean = true): Promise<Station[]> {
    const cacheKey = `${this.CACHE_KEY}:${activeOnly}`;
    let stations = await cacheGet(cacheKey);

    if (!stations) {
      const whereClause = activeOnly ? 'WHERE is_active = true' : '';
      const result = await query(
        `SELECT id, code, name, name_ml, name_hi, 
                location[0] as lng, location[1] as lat,
                address, facilities, is_active, order_index, created_at, updated_at
         FROM stations ${whereClause}
         ORDER BY order_index, name`
      );

      stations = result.rows.map(station => ({
        ...station,
        location: { lat: station.lat, lng: station.lng },
        facilities: JSON.parse(station.facilities || '[]')
      }));

      // Cache for 1 hour
      await cacheSet(cacheKey, stations, this.CACHE_TTL);
    }

    return stations;
  }

  static async findById(id: string): Promise<Station | null> {
    const result = await query(
      `SELECT id, code, name, name_ml, name_hi, 
              location[0] as lng, location[1] as lat,
              address, facilities, is_active, order_index, created_at, updated_at
       FROM stations WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;

    const station = result.rows[0];
    return {
      ...station,
      location: { lat: station.lat, lng: station.lng },
      facilities: JSON.parse(station.facilities || '[]')
    };
  }

  static async findByCode(code: string): Promise<Station | null> {
    const result = await query(
      `SELECT id, code, name, name_ml, name_hi, 
              location[0] as lng, location[1] as lat,
              address, facilities, is_active, order_index, created_at, updated_at
       FROM stations WHERE code = $1`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) return null;

    const station = result.rows[0];
    return {
      ...station,
      location: { lat: station.lat, lng: station.lng },
      facilities: JSON.parse(station.facilities || '[]')
    };
  }

  static async update(id: string, updates: Partial<Station>): Promise<Station> {
    const allowedFields = ['name', 'name_ml', 'name_hi', 'address', 'facilities', 'is_active', 'order_index'];
    const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    let setClause = updateFields.map((field, index) => {
      if (field === 'facilities') return `${field} = $${index + 2}`;
      return `${field} = $${index + 2}`;
    }).join(', ');

    const values = [id, ...updateFields.map(field => {
      if (field === 'facilities') return JSON.stringify(updates[field as keyof Station]);
      return updates[field as keyof Station];
    })];

    const result = await query(
      `UPDATE stations SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, code, name, name_ml, name_hi, 
                location[0] as lng, location[1] as lat,
                address, facilities, is_active, order_index, created_at, updated_at`,
      values
    );

    // Clear cache
    await this.clearCache();

    const station = result.rows[0];
    return {
      ...station,
      location: { lat: station.lat, lng: station.lng },
      facilities: JSON.parse(station.facilities || '[]')
    };
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE stations SET is_active = false WHERE id = $1',
      [id]
    );

    // Clear cache
    await this.clearCache();

    return result.rowCount > 0;
  }

  static async search(searchTerm: string): Promise<Station[]> {
    const result = await query(
      `SELECT id, code, name, name_ml, name_hi, 
              location[0] as lng, location[1] as lat,
              address, facilities, is_active, order_index, created_at, updated_at
       FROM stations 
       WHERE is_active = true AND (
         LOWER(name) LIKE LOWER($1) OR 
         LOWER(code) LIKE UPPER($1) OR 
         LOWER(name_ml) LIKE LOWER($1) OR 
         LOWER(name_hi) LIKE LOWER($1)
       )
       ORDER BY order_index, name
       LIMIT 10`,
      [`%${searchTerm}%`]
    );

    return result.rows.map(station => ({
      ...station,
      location: { lat: station.lat, lng: station.lng },
      facilities: JSON.parse(station.facilities || '[]')
    }));
  }

  static async getRoute(fromStationId: string, toStationId: string): Promise<Station[]> {
    // This is a simplified implementation
    // In reality, you'd have route_stations table to handle complex routing
    const result = await query(
      `SELECT s.id, s.code, s.name, s.name_ml, s.name_hi, 
              s.location[0] as lng, s.location[1] as lat,
              s.address, s.facilities, s.is_active, s.order_index, 
              s.created_at, s.updated_at
       FROM stations s
       WHERE s.is_active = true 
         AND s.order_index BETWEEN 
           (SELECT order_index FROM stations WHERE id = $1) AND
           (SELECT order_index FROM stations WHERE id = $2)
       ORDER BY s.order_index`,
      [fromStationId, toStationId]
    );

    return result.rows.map(station => ({
      ...station,
      location: { lat: station.lat, lng: station.lng },
      facilities: JSON.parse(station.facilities || '[]')
    }));
  }

  private static async clearCache(): Promise<void> {
    // Clear all station-related cache keys
    const keys = [
      `${this.CACHE_KEY}:true`,
      `${this.CACHE_KEY}:false`
    ];
    
    // Note: In a real application, you might want to implement a more sophisticated cache invalidation
    for (const key of keys) {
      // We'd need to implement cacheDel or use a cache invalidation pattern
    }
  }
}