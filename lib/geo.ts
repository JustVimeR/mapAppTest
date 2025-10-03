import * as d3 from "d3-geo";
import type { GeoPath, GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { CountriesFC, CountryFeature } from "../types/geo";

export function topoToCountriesFC(worldTopo: any): CountriesFC {
	const objName = Object.keys(worldTopo.objects)[0];
	const fc = feature(worldTopo, worldTopo.objects[objName]) as any;
	return fc as CountriesFC;
}

export function buildProjection(
	width: number,
	height: number,
	fc: CountriesFC
): GeoProjection {
	return d3.geoEquirectangular().fitSize([width, height], fc as any);
}

export function buildGeoPath(
	projection: GeoProjection
): GeoPath<any, d3.GeoPermissibleObjects> {
	return d3.geoPath(projection);
}

export function featureISO(f: CountryFeature): string | undefined {
	const p = f.properties ?? {};
	const cand =
		p.ISO_A3?.trim() ||
		(p as any).ISO_A3_EH?.trim() ||
		p.ADM0_A3?.trim() ||
		(p as any).SOV_A3?.trim() ||
		(p as any).GU_A3?.trim() ||
		(p as any).BRK_A3?.trim() ||
		"";

	if (!cand || cand === "-99") return undefined;
	return cand;
}

export function featureName(f: CountryFeature): string {
	return f.properties?.ADMIN || f.properties?.NAME_EN || "Unknown";
}
