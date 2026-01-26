export interface IEvent {
  id: number;
  event_name: string;
  description?: string;
  event_image?: string;
  event_date: string;
  location?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface ICreateEventRequest {
  event_name: string;
  description?: string;
  event_image?: string;
  event_date: string;
  location?: string;
}

export interface IUpdateEventRequest extends Partial<ICreateEventRequest> {
  id: number;
}

export interface IEventSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  upcoming?: boolean;
}

export interface IEventPaginationResponse {
  events: IEvent[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface IApiResponse<T> {
  status: number;
  message: string;
  data: T;
  meta?: any;
}
