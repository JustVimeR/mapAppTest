import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	SafeAreaView,
	View,
	Text,
	ActivityIndicator,
	Pressable,
	Alert,
} from "react-native";

import { topoToCountriesFC } from "../../lib/geo";
import type { CountriesFC } from "../../types/geo";
import { getMyCountries, saveMyCountries } from "../../services/api";
import WorldMap from "../components/WorldMap";
import worldTopo from "../../assets/data/world-50m.geo.json";

export default function MapScreen() {
	const countries: CountriesFC = useMemo(
		() => topoToCountriesFC(worldTopo as any),
		[]
	);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());

	useEffect(() => {
		(async () => {
			try {
				const iso = await getMyCountries();
				setSelected(new Set(iso));
			} catch (e: any) {
				Alert.alert("Ошибка", e?.message ?? "Не удалось загрузить страны");
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	const onToggle = (iso: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(iso)) next.delete(iso);
			else next.add(iso);
			return next;
		});
	};

	const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		if (loading) return;
		if (saveTimer.current) clearTimeout(saveTimer.current);
		saveTimer.current = setTimeout(async () => {
			try {
				setSaving(true);
				await saveMyCountries(Array.from(selected));
			} catch (e: any) {
				Alert.alert("Ошибка", e?.message ?? "Не удалось сохранить");
			} finally {
				setSaving(false);
			}
		}, 400);
		return () => {
			if (saveTimer.current) clearTimeout(saveTimer.current);
		};
	}, [selected, loading]);

	if (loading) {
		return (
			<SafeAreaView
				style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
			>
				<ActivityIndicator />
				<Text style={{ marginTop: 8 }}>Загрузка…</Text>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<Text style={{ fontSize: 18, fontWeight: "600" }}>
					Selected: {selected.size}
				</Text>
				<Pressable
					onPress={() => setSelected(new Set())}
					style={{
						paddingHorizontal: 12,
						paddingVertical: 8,
						borderRadius: 8,
						backgroundColor: "#eef3ff",
					}}
				>
					<Text>Clear</Text>
				</Pressable>
			</View>

			<WorldMap countries={countries} selected={selected} onToggle={onToggle} />

			{saving && (
				<Text style={{ textAlign: "center", opacity: 0.6 }}>Сохранение…</Text>
			)}
		</SafeAreaView>
	);
}
