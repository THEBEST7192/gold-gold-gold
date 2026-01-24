export type StopInfo = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isDestination?: boolean;
};

export type BusInfo = {
  id: string;
  name: string;
  currentStop: string;
  destination: string;
  destinationStopId: string | undefined;
  latitude: number | null;
  longitude: number | null;
  nearbyStops?: StopInfo[];
};

export type Player = {
  id: string;
  name: string;
  betBusId: string;
};

export type BusStats = Record<
  string,
  { distance: number; lastLatitude: number | null; lastLongitude: number | null }
>;
