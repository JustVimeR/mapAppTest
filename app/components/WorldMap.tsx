import React, { useMemo, useState, useCallback } from "react";
import { View, LayoutChangeEvent } from "react-native";
import Svg, { Rect, Path } from "react-native-svg";
import { buildProjection, buildGeoPath, featureISO } from "../../lib/geo";
import type { CountriesFC, CountryFeature } from "../../types/geo";

type Props = {
	countries: CountriesFC;
	selected: Set<string>;
	onToggle: (iso: string) => void;
};

const OCEAN = "#E6F2FF";
const STROKE = "#BFC8D6";
const FILL_SELECTED = "#F4A261";
const FILL_UNSELECTED = "#FFFFFF";

export default function WorldMap({ countries, selected, onToggle }: Props) {
	const [size, setSize] = useState({ w: 0, h: 0 });
	const keysSeen = new Set<string>();

	const onLayout = (e: LayoutChangeEvent) => {
		const w = e.nativeEvent.layout.width;
		const h = Math.max(1, Math.round(w / 2));
		setSize({ w, h });
	};

	const { paths } = useMemo(() => {
		if (!size.w || !size.h)
			return { paths: [] as { f: CountryFeature; d: string; iso?: string }[] };
		const proj = buildProjection(size.w, size.h, countries);
		const geoPath = buildGeoPath(proj);
		const arr = countries.features.map((f: any) => {
			const d = geoPath(f) || "";
			const iso = featureISO(f);
			return { f, d, iso };
		});
		return { paths: arr };
	}, [size, countries]);

	const handlePress = useCallback(
		(iso?: string) => {
			if (!iso) return;
			onToggle(iso);
		},
		[onToggle]
	);

	return (
		<View onLayout={onLayout} style={{ width: "100%", aspectRatio: 2 }}>
			{size.w > 0 && (
				<Svg width={size.w} height={size.h}>
					<Rect x={0} y={0} width={size.w} height={size.h} fill={OCEAN} />
					{paths.map(({ f, d, iso }, i) => {
						const isSel = iso ? selected.has(iso) : false;
						let base =
							iso || f.properties?.ADMIN || f.properties?.NAME_EN || "UNK";
						let key = `${base}-${(f as any).id ?? "x"}-${i}`;
						while (keysSeen.has(key)) key = `${key}_dup`;
						keysSeen.add(key);

						return (
							<Path
								key={key}
								d={d}
								fill={isSel ? FILL_SELECTED : FILL_UNSELECTED}
								stroke={STROKE}
								strokeWidth={0.5}
								onPress={() => handlePress(iso)}
							/>
						);
					})}
				</Svg>
			)}
		</View>
	);
}
