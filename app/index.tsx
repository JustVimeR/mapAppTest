import { Link } from "expo-router";
import { View, Text } from "react-native";

export default function Index() {
	return (
		<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
			<Text>Главная</Text>
			<Link href="/(map)/MapScreen">Открыть карту</Link>
		</View>
	);
}
