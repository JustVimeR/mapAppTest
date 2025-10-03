import type { Feature, FeatureCollection, Geometry } from "geojson";

export type CountryFeature = Feature<
	Geometry,
	{
		ISO_A3?: string;
		ADM0_A3?: string;
		ADMIN?: string;
		NAME_EN?: string;
		CONTINENT?: string;
	}
>;

export type CountriesFC = FeatureCollection<
	Geometry,
	CountryFeature["properties"]
>;
