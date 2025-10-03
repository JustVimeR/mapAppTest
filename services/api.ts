const BASE_URL = "https://your-backend.example.com";
const USE_MOCK = true;

let mockStorage = new Set<string>(["UKR", "USA"]);

export async function getMyCountries(): Promise<string[]> {
	if (USE_MOCK) {
		// BE immitation
		await new Promise((r) => setTimeout(r, 250));
		return Array.from(mockStorage);
	}
	const res = await fetch(`${BASE_URL}/me/countries`);
	if (!res.ok) throw new Error("Failed to fetch countries");
	const data = await res.json();
	return data.countries ?? [];
}

export async function saveMyCountries(countries: string[]): Promise<void> {
	if (USE_MOCK) {
		await new Promise((r) => setTimeout(r, 250));
		mockStorage = new Set(countries);
		return;
	}
	const res = await fetch(`${BASE_URL}/me/countries`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ countries }),
	});
	if (!res.ok) throw new Error("Failed to save countries");
}
