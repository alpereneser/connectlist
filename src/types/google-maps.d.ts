// Google Maps API için TypeScript tanımlamaları
declare namespace google {
  namespace maps {
    namespace places {
      class PlacesService {
        constructor(attributionNode: HTMLElement);
        textSearch(
          request: {
            query: string;
            fields?: string[];
            locationBias?: any;
          },
          callback: (
            results: Array<{
              place_id: string;
              name: string;
              formatted_address: string;
              photos?: Array<{
                getUrl: (options: { maxWidth: number; maxHeight: number }) => string;
              }>;
              geometry?: {
                location: {
                  lat: () => number;
                  lng: () => number;
                };
              };
              rating?: number;
              user_ratings_total?: number;
              types?: string[];
            }>,
            status: string
          ) => void
        ): void;
      }
      
      const PlacesServiceStatus: {
        OK: string;
        ZERO_RESULTS: string;
        OVER_QUERY_LIMIT: string;
        REQUEST_DENIED: string;
        INVALID_REQUEST: string;
        UNKNOWN_ERROR: string;
      };
    }
  }
}
