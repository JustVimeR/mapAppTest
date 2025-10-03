import { Stack } from "expo-router";

export default function RootLayout() {
	return (
		<Stack>
			<Stack.Screen name="(map)/MapScreen" options={{ title: "World Map" }} />
		</Stack>
	);
}
