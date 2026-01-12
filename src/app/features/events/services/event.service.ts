import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// Models
import {
  IEvent,
  ICreateEventRequest,
  IUpdateEventRequest,
  IEventSearchParams,
  IEventPaginationResponse,
  IApiResponse
} from '../models/event.model';

// Core Services
import { RestApiService } from '../../../core/services/rest-api.service';

@Injectable({
  providedIn: 'root'
})
export class EventService {

  constructor(private restApi: RestApiService) { }

  /**
   * Get all events with optional search parameters
   */
  getEvents(params?: IEventSearchParams): Observable<IEvent[]> {
    return this.restApi.getAllEvents(params || {});
  }

  /**
   * Get events with pagination
   */
  getEventsPaginated(params?: IEventSearchParams): Observable<IApiResponse<IEventPaginationResponse>> {
    return this.restApi.getEventsPaginated(params || {});
  }

  /**
   * Get event by ID
   */
  getEventById(id: number): Observable<IEvent> {
    return this.restApi.getEventById(id);
  }

  /**
   * Create new event
   */
  createEvent(data: ICreateEventRequest): Observable<IEvent> {
    return this.restApi.createEvent(data);
  }

  /**
   * Update event
   */
  updateEvent(id: number, data: Partial<ICreateEventRequest>): Observable<IEvent> {
    return this.restApi.updateEvent(id, data);
  }

  /**
   * Delete event (hard delete)
   */
  deleteEvent(id: number): Observable<IEvent> {
    return this.restApi.deleteEvent(id);
  }

  /**
   * Soft delete event (change status to inactive)
   */
  softDeleteEvent(id: number): Observable<IEvent> {
    return this.restApi.softDeleteEvent(id);
  }

  /**
   * Bulk delete events
   */
  deleteBulkEvents(ids: number[]): Observable<IEvent[]> {
    return this.restApi.deleteBulkEvents(ids);
  }

  /**
   * Get upcoming events (public)
   */
  getUpcomingEvents(limit?: number): Observable<IEvent[]> {
    return this.restApi.getUpcomingEvents({ limit });
  }
}
