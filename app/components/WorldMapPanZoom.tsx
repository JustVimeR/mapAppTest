import React, { useMemo, useRef, useState, useCallback } from "react";
import { LayoutChangeEvent, Animated, StyleSheet } from "react-native";
import Svg, { Rect, Path } from "react-native-svg";
import * as d3 from "d3-geo";
import { buildProjection, featureISO } from "../../lib/geo";
import type { CountriesFC, CountryFeature } from "../../types/geo";
import {
	PanGestureHandler,
	PinchGestureHandler,
	GestureHandlerRootView,
	State as GHState,
} from "react-native-gesture-handler";

type Props = {
	countries: CountriesFC;
	selected: Set<string>;
	onToggle: (iso: string) => void;
};

const OCEAN = "#E6F2FF";
const STROKE = "#BFC8D6";
const FILL_SELECTED = "#F4A261";
const FILL_UNSELECTED = "#FFFFFF";

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

export default function WorldMapPanZoom({
	countries,
	selected,
	onToggle,
}: Props) {
	const [size, setSize] = useState({ w: 0, h: 0 });

	// базовая проекция (fitSize) и исходные scale/translate
	const base = useMemo(() => {
		if (!size.w || !size.h)
			return null as null | {
				scale0: number;
				tx0: number;
				ty0: number;
				features: CountryFeature[];
			};
		const proj0 = buildProjection(size.w, size.h, countries);
		const scale0 = proj0.scale();
		const [tx0, ty0] = proj0.translate();
		return {
			scale0,
			tx0,
			ty0,
			features: countries.features as unknown as CountryFeature[],
		};
	}, [size, countries]);

	// управляемые значения зума/пан
	const zoom = useRef(1); // множитель к scale0
	const dx = useRef(0); // пиксели добавки к tx0
	const dy = useRef(0);

	// animated-«проводочки», чтобы считывать жесты без лагов
	const aScale = useRef(new Animated.Value(1)).current;
	const aTransX = useRef(new Animated.Value(0)).current;
	const aTransY = useRef(new Animated.Value(0)).current;

	// фиксируем значения между жестами
	const lastZoom = useRef(1);
	const lastX = useRef(0);
	const lastY = useRef(0);

	// "тик" для перерисовки (минимальный re-render)
	const [tick, setTick] = useState(0);
	const schedule = useRef<number | null>(null);
	const requestRecalc = () => {
		if (schedule.current != null) return;
		schedule.current = requestAnimationFrame(() => {
			schedule.current = null;
			setTick((t) => t + 1);
		});
	};

	const clamp = (v: number, min: number, max: number) =>
		Math.min(Math.max(v, min), max);

	// ограничим пан, чтобы при текущем зуме не вылетать
	const clampTranslate = (t: number, zoomVal: number, dim: number) => {
		// при увеличении виртуальный размер = dim * zoomVal
		const maxShift = Math.max(0, (dim * zoomVal - dim) / 2);
		return clamp(t, -maxShift, maxShift);
	};

	const onLayout = (e: LayoutChangeEvent) => {
		const { width, height } = e.nativeEvent.layout;
		setSize({
			w: Math.max(1, Math.round(width)),
			h: Math.max(1, Math.round(height)),
		});
	};

	// ----- PINCH (зуум) -----
	const onPinchEvent = Animated.event([{ nativeEvent: { scale: aScale } }], {
		useNativeDriver: false,
		listener: (e: any) => {
			if (!base) return;
			const raw = lastZoom.current * e.nativeEvent.scale;
			const next = clamp(raw, MIN_ZOOM, MAX_ZOOM);
			zoom.current = next;
			// при изменении зума — пересчитать клампы текущих dx/dy
			dx.current = clampTranslate(lastX.current, next, size.w);
			dy.current = clampTranslate(lastY.current, next, size.h);
			requestRecalc();
		},
	});

	const onPinchStateChange = (e: any) => {
		if (e.nativeEvent.oldState === GHState.ACTIVE) {
			// зафиксировать зум и нормализовать animated-value
			lastZoom.current = zoom.current;
			aScale.setValue(1);
		} else if (e.nativeEvent.state === GHState.BEGAN) {
			aScale.setValue(1);
		}
	};

	// ----- PAN (перемещение) -----
	const onPanEvent = Animated.event(
		[{ nativeEvent: { translationX: aTransX, translationY: aTransY } }],
		{
			useNativeDriver: false,
			listener: (e: any) => {
				if (!base) return;
				const z = zoom.current;
				const nextX = clampTranslate(
					lastX.current + e.nativeEvent.translationX,
					z,
					size.w
				);
				const nextY = clampTranslate(
					lastY.current + e.nativeEvent.translationY,
					z,
					size.h
				);
				dx.current = nextX;
				dy.current = nextY;
				requestRecalc();
			},
		}
	);

	const onPanStateChange = (e: any) => {
		if (e.nativeEvent.oldState === GHState.ACTIVE) {
			lastX.current = dx.current;
			lastY.current = dy.current;
			aTransX.setValue(0);
			aTransY.setValue(0);
		} else if (e.nativeEvent.state === GHState.BEGAN) {
			// no-op
		}
	};

	// проекция под текущие zoom/pan
	const projection = useMemo(() => {
		if (!base) return null as d3.GeoProjection | null;
		const p = d3.geoEquirectangular();
		p.scale(base.scale0 * zoom.current).translate([
			base.tx0 + dx.current,
			base.ty0 + dy.current,
		]);
		return p;
	}, [base, tick]);

	// pathbuilder с повышенной точностью
	const geoPath = useMemo(() => {
		if (!projection) return null;
		return d3.geoPath(projection); // precision не трогаем — TS типов нет
	}, [projection]);

	const keysSeen = new Set<string>();
	const handlePress = useCallback(
		(iso?: string) => {
			if (iso) onToggle(iso);
		},
		[onToggle]
	);

	return (
		<GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
			{base && projection && geoPath && (
				<PinchGestureHandler
					onGestureEvent={onPinchEvent}
					onHandlerStateChange={onPinchStateChange}
				>
					<Animated.View style={StyleSheet.absoluteFill}>
						<PanGestureHandler
							onGestureEvent={onPanEvent}
							onHandlerStateChange={onPanStateChange}
						>
							<Animated.View style={{ flex: 1 }}>
								<Svg
									width={size.w}
									height={size.h}
									// чуть лучше сглаживание
									{...({ shapeRendering: "geometricPrecision" } as any)}
								>
									<Rect
										x={0}
										y={0}
										width={size.w}
										height={size.h}
										fill={OCEAN}
									/>
									{base.features.map((f, i) => {
										const iso = featureISO(f);
										const d = geoPath!(f as any) || "";
										const isSel = iso ? selected.has(iso) : false;
										let baseKey =
											iso ||
											f.properties?.ADMIN ||
											f.properties?.NAME_EN ||
											"UNK";
										let key = `${baseKey}-${(f as any).id ?? "x"}-${i}`;
										while (keysSeen.has(key)) key = `${key}_dup`;
										keysSeen.add(key);

										return (
											<Path
												key={key}
												d={d}
												fill={isSel ? FILL_SELECTED : FILL_UNSELECTED}
												stroke={STROKE}
												strokeWidth={0.5}
												vectorEffect="non-scaling-stroke"
												onPress={() => handlePress(iso)}
											/>
										);
									})}
								</Svg>
							</Animated.View>
						</PanGestureHandler>
					</Animated.View>
				</PinchGestureHandler>
			)}
		</GestureHandlerRootView>
	);
}
