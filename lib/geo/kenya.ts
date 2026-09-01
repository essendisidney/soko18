import { LAUNCH_CITY, NAIROBI_AREAS, WAITLIST_CITIES } from "@/lib/data/nairobi";
import { waitlistAreas } from "@/lib/data/waitlist";

export type GeoPlace = {
  citySlug: string;
  cityName: string;
  areaSlug: string;
  areaName: string;
  lat: number;
  lng: number;
};

const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  nairobi: { lat: -1.2864, lng: 36.8172 },
  mombasa: { lat: -4.0435, lng: 39.6682 },
  kisumu: { lat: -0.0917, lng: 34.768 },
  nakuru: { lat: -0.3031, lng: 36.08 },
  eldoret: { lat: 0.5143, lng: 35.2698 },
  thika: { lat: -1.0333, lng: 37.0833 },
  machakos: { lat: -1.5177, lng: 37.2634 },
  kitale: { lat: 1.0167, lng: 35.0062 },
  kakamega: { lat: 0.2827, lng: 34.7519 },
  kisii: { lat: -0.6817, lng: 34.7667 },
  nyeri: { lat: -0.4201, lng: 36.9476 },
  meru: { lat: 0.0463, lng: 37.6559 },
  malindi: { lat: -3.2175, lng: 40.1191 },
  naivasha: { lat: -0.7167, lng: 36.4333 },
  kericho: { lat: -0.3677, lng: 35.2831 },
  embu: { lat: -0.5396, lng: 37.4575 },
  nanyuki: { lat: 0.0167, lng: 37.0728 },
  garissa: { lat: -0.4536, lng: 39.6461 },
  kitui: { lat: -1.367, lng: 38.0106 },
  "homa-bay": { lat: -0.5273, lng: 34.4571 },
  migori: { lat: -1.0634, lng: 34.4731 },
};

const NAIROBI_AREA_POINTS: Record<string, { lat: number; lng: number }> = {
  westlands: { lat: -1.268, lng: 36.811 },
  kilimani: { lat: -1.292, lng: 36.788 },
  kileleshwa: { lat: -1.288, lng: 36.785 },
  lavington: { lat: -1.283, lng: 36.775 },
  cbd: { lat: -1.286, lng: 36.821 },
  "south-b": { lat: -1.318, lng: 36.837 },
  karen: { lat: -1.32, lng: 36.715 },
  parklands: { lat: -1.263, lng: 36.818 },
  "thika-road": { lat: -1.219, lng: 36.888 },
};

function offset(lat: number, lng: number, index: number) {
  const ring = [
    [0, 0],
    [0.012, 0.008],
    [-0.01, 0.01],
    [0.008, -0.012],
  ];
  const [dLat, dLng] = ring[index % ring.length]!;
  return { lat: lat + dLat, lng: lng + dLng };
}

export function kenyaPlaces(): GeoPlace[] {
  const nairobi: GeoPlace[] = NAIROBI_AREAS.map((area) => {
    const point = NAIROBI_AREA_POINTS[area.slug] ?? CITY_CENTERS.nairobi;
    return {
      citySlug: LAUNCH_CITY.slug,
      cityName: LAUNCH_CITY.name,
      areaSlug: area.slug,
      areaName: area.name,
      lat: point.lat,
      lng: point.lng,
    };
  });

  const rest = WAITLIST_CITIES.flatMap((city) => {
    const center = CITY_CENTERS[city.slug] ?? CITY_CENTERS.nairobi;
    return waitlistAreas(city.slug).map((area, index) => {
      const point = offset(center.lat, center.lng, index);
      return {
        citySlug: city.slug,
        cityName: city.name,
        areaSlug: area.slug,
        areaName: area.name,
        lat: point.lat,
        lng: point.lng,
      };
    });
  });

  return [...nairobi, ...rest];
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(s));
}

export function snapPlace(lat: number, lng: number, places = kenyaPlaces()): GeoPlace {
  return places.reduce((best, place) => {
    const here = haversineKm({ lat, lng }, place);
    const closest = haversineKm({ lat, lng }, best);
    return here < closest ? place : best;
  });
}

export function cityNameBySlug(slug: string) {
  if (slug === LAUNCH_CITY.slug) return LAUNCH_CITY.name;
  return WAITLIST_CITIES.find((city) => city.slug === slug)?.name ?? "Kenya";
}
