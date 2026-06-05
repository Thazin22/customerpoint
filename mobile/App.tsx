import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  balance: number;
};

type PointTransaction = {
  id: number;
  type: "earn" | "redeem" | "adjustment";
  points: number;
  purchase_amount: string | null;
  redemption_value: string | null;
  note: string | null;
  created_at: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  return data;
}

export default function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionTab, setActionTab] = useState<"earn" | "redeem">("earn");

  const canCreate = useMemo(() => name.trim() && phone.trim(), [name, phone]);
  const canEarn = Boolean(selectedCustomer && purchaseAmount.trim());
  const canRedeem = Boolean(selectedCustomer && redeemPoints.trim());

  async function loadCustomers(nextSearch = search) {
    setLoading(true);
    try {
      const result = await request<Customer[]>(
        `/customers?search=${encodeURIComponent(nextSearch)}`
      );
      setCustomers(result);

      if (selectedCustomer) {
        const fresh = result.find((customer) => customer.id === selectedCustomer.id);
        if (fresh) {
          setSelectedCustomer(fresh);
        }
      }
    } catch (error) {
      Alert.alert("Could not load customers", getMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions(customerId: number) {
    try {
      const result = await request<PointTransaction[]>(
        `/customers/${customerId}/transactions`
      );
      setTransactions(result);
    } catch (error) {
      Alert.alert("Could not load transactions", getMessage(error));
    }
  }

  async function createCustomer() {
    if (!canCreate) return;

    try {
      const customer = await request<Customer>("/customers", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() })
      });
      setName("");
      setPhone("");
      setSearch("");
      setSelectedCustomer(customer);
      await loadCustomers("");
      await loadTransactions(customer.id);
    } catch (error) {
      Alert.alert("Could not create customer", getMessage(error));
    }
  }

  async function earnPoints() {
    if (!selectedCustomer || !purchaseAmount) return;

    try {
      await request("/points/earn", {
        method: "POST",
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          purchaseAmount: Number(purchaseAmount),
          note: "Purchase"
        })
      });
      setPurchaseAmount("");
      await refreshSelectedCustomer();
    } catch (error) {
      Alert.alert("Could not add points", getMessage(error));
    }
  }

  async function redeem() {
    if (!selectedCustomer || !redeemPoints) return;

    try {
      await request("/points/redeem", {
        method: "POST",
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          points: Number(redeemPoints),
          note: "Reward redemption"
        })
      });
      setRedeemPoints("");
      await refreshSelectedCustomer();
    } catch (error) {
      Alert.alert("Could not redeem points", getMessage(error));
    }
  }

  async function refreshSelectedCustomer() {
    if (!selectedCustomer) return;

    const customer = await request<Customer>(`/customers/${selectedCustomer.id}`);
    setSelectedCustomer(customer);
    await loadTransactions(customer.id);
    await loadCustomers(search);
  }

  function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    loadTransactions(customer.id);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const earnPreview =
    purchaseAmount && !isNaN(Number(purchaseAmount))
      ? Math.floor(Number(purchaseAmount) * 10)
      : null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.kicker}>Loyalty desk</Text>
            <Text style={styles.title}>Customers</Text>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => loadCustomers(search)}
              placeholder="Search by name or phone…"
              returnKeyType="search"
              style={styles.searchInput}
              placeholderTextColor="#A0A09A"
            />
            <Pressable style={styles.searchBtn} onPress={() => loadCustomers(search)}>
              <Text style={styles.searchBtnText}>Search</Text>
            </Pressable>
          </View>

          {/* Selected customer card */}
          {selectedCustomer ? (
            <View style={styles.balanceCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(selectedCustomer.name)}</Text>
              </View>
              <View style={styles.custMeta}>
                <Text style={styles.custNameLarge}>{selectedCustomer.name}</Text>
                <Text style={styles.custPhone}>{selectedCustomer.phone}</Text>
              </View>
              <View style={styles.pointsPill}>
                <Text style={styles.pointsNum}>{selectedCustomer.balance.toLocaleString()}</Text>
                <Text style={styles.pointsLbl}>points</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No customer selected</Text>
              <Text style={styles.emptyBody}>
                Search or create a customer to earn or redeem points.
              </Text>
            </View>
          )}

          {/* Point action */}
          <Text style={styles.sectionLabel}>Point action</Text>
          <View style={styles.actionCard}>
            <View style={styles.tabRow}>
              {(["earn", "redeem"] as const).map((tab) => (
                <Pressable
                  key={tab}
                  style={[styles.tab, actionTab === tab && styles.tabActive]}
                  onPress={() => setActionTab(tab)}
                >
                  <Text style={[styles.tabText, actionTab === tab && styles.tabTextActive]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.actionBody}>
              {actionTab === "earn" ? (
                <>
                  <Text style={styles.actionHint}>Enter the purchase total to calculate points</Text>
                  <View style={styles.actionRow}>
                    <TextInput
                      value={purchaseAmount}
                      onChangeText={setPurchaseAmount}
                      placeholder="Purchase amount"
                      keyboardType="numeric"
                      style={styles.actionInput}
                      placeholderTextColor="#A0A09A"
                    />
                    <Pressable
                      style={[styles.btnEarn, !canEarn && styles.btnDisabled]}
                      onPress={earnPoints}
                      disabled={!canEarn}
                    >
                      <Text style={styles.btnEarnText}>Earn</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.earnRate}>
                    10 pts per £1
                    {earnPreview !== null ? (
                      <Text style={styles.earnPreview}>{"  →  "}+{earnPreview} pts</Text>
                    ) : null}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.actionHint}>Enter points to redeem for this customer</Text>
                  <View style={styles.actionRow}>
                    <TextInput
                      value={redeemPoints}
                      onChangeText={setRedeemPoints}
                      placeholder="Points to redeem"
                      keyboardType="numeric"
                      style={styles.actionInput}
                      placeholderTextColor="#A0A09A"
                    />
                    <Pressable
                      style={[styles.btnRedeem, !canRedeem && styles.btnDisabled]}
                      onPress={redeem}
                      disabled={!canRedeem}
                    >
                      <Text style={styles.btnRedeemText}>Redeem</Text>
                    </Pressable>
                  </View>
                  {selectedCustomer && (
                    <Text style={styles.earnRate}>
                      Available:{" "}
                      <Text style={styles.earnPreview}>
                        {selectedCustomer.balance.toLocaleString()} pts
                      </Text>
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Recent customers */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Recent customers</Text>
            {loading ? <ActivityIndicator size="small" color="#534AB7" /> : null}
          </View>
          {customers.length === 0 ? (
            <Text style={styles.mutedText}>No customers yet.</Text>
          ) : (
            customers.map((item) => {
              const isSelected = selectedCustomer?.id === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.custRow, isSelected && styles.custRowSelected]}
                  onPress={() => selectCustomer(item)}
                >
                  <View style={[styles.avatarSm, isSelected && styles.avatarSmSelected]}>
                    <Text style={[styles.avatarSmText, isSelected && styles.avatarSmTextSelected]}>
                      {initials(item.name)}
                    </Text>
                  </View>
                  <View style={styles.custRowInfo}>
                    <Text style={styles.custRowName}>{item.name}</Text>
                    <Text style={styles.custRowPhone}>{item.phone}</Text>
                  </View>
                  <View style={[styles.ptsBadge, isSelected && styles.ptsBadgeSelected]}>
                    <Text style={[styles.ptsBadgeText, isSelected && styles.ptsBadgeTextSelected]}>
                      {item.balance.toLocaleString()} pts
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}

          {/* New customer */}
          <Text style={[styles.sectionLabel, { marginTop: 6 }]}>New customer</Text>
          <View style={styles.newCustCard}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Customer name"
              style={styles.fullInput}
              placeholderTextColor="#A0A09A"
            />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              keyboardType="phone-pad"
              style={styles.fullInput}
              placeholderTextColor="#A0A09A"
            />
            <Pressable
              style={[styles.btnCreate, !canCreate && styles.btnDisabled]}
              onPress={createCustomer}
              disabled={!canCreate}
            >
              <Text style={styles.btnCreateText}>Create customer</Text>
            </Pressable>
          </View>

          {/* History */}
          {selectedCustomer ? (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 6 }]}>History</Text>
              {transactions.length === 0 ? (
                <Text style={styles.mutedText}>No point history yet.</Text>
              ) : (
                transactions.slice(0, 8).map((item) => (
                  <View key={item.id} style={styles.txRow}>
                    <View>
                      <Text style={styles.txType}>{item.type}</Text>
                      <Text style={styles.txDate}>{formatDate(item.created_at)}</Text>
                    </View>
                    <Text style={item.points > 0 ? styles.txPositive : styles.txNegative}>
                      {item.points > 0 ? "+" : ""}
                      {item.points} pts
                    </Text>
                  </View>
                ))
              )}
            </>
          ) : null}

          <View style={{ height: 16 }} />
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

const PURPLE = "#534AB7";
const PURPLE_LIGHT = "#EEEDFE";
const PURPLE_MID = "#7F77DD";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F4F0"
  },
  content: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 8
  },

  // Header
  header: { marginBottom: 4 },
  kicker: {
    fontSize: 11,
    color: "#888780",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2
  },
  title: { fontSize: 26, fontWeight: "600", color: "#1A1A18" },

  // Search
  searchRow: { flexDirection: "row", gap: 8 },
  searchInput: {
    flex: 1,
    height: 42,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "#D3D1C7",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#1A1A18"
  },
  searchBtn: {
    height: 42,
    paddingHorizontal: 16,
    backgroundColor: PURPLE,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  searchBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  // Balance card
  balanceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#D3D1C7",
    padding: 14,
    gap: 10
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#CECBF6",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: { fontSize: 14, fontWeight: "600", color: "#3C3489" },
  custMeta: { flex: 1 },
  custNameLarge: { fontSize: 16, fontWeight: "600", color: "#1A1A18" },
  custPhone: { fontSize: 12, color: "#888780", marginTop: 2 },
  pointsPill: {
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 72
  },
  pointsNum: { fontSize: 20, fontWeight: "600", color: "#3C3489", lineHeight: 24 },
  pointsLbl: { fontSize: 10, color: "#534AB7", letterSpacing: 0.5, marginTop: 1 },

  // Empty card
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#D3D1C7",
    padding: 16,
    alignItems: "center"
  },
  emptyTitle: { fontSize: 15, fontWeight: "500", color: "#1A1A18", marginBottom: 4 },
  emptyBody: { fontSize: 13, color: "#888780", textAlign: "center", lineHeight: 18 },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    color: "#888780",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginTop: 8,
    marginBottom: 2
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 2
  },

  // Action card
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#D3D1C7",
    overflow: "hidden"
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#D3D1C7"
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center"
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: PURPLE
  },
  tabText: { fontSize: 14, fontWeight: "500", color: "#888780" },
  tabTextActive: { color: PURPLE },
  actionBody: { padding: 14, gap: 8 },
  actionHint: { fontSize: 12, color: "#888780" },
  actionRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  actionInput: {
    flex: 1,
    height: 40,
    backgroundColor: "#F5F4F0",
    borderRadius: 9,
    borderWidth: 0.5,
    borderColor: "#D3D1C7",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#1A1A18"
  },
  btnEarn: {
    height: 40,
    paddingHorizontal: 20,
    backgroundColor: PURPLE,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center"
  },
  btnEarnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  btnRedeem: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: PURPLE,
    alignItems: "center",
    justifyContent: "center"
  },
  btnRedeemText: { fontSize: 14, fontWeight: "600", color: PURPLE },
  btnDisabled: { opacity: 0.4 },
  earnRate: { fontSize: 12, color: "#888780" },
  earnPreview: { color: PURPLE, fontWeight: "600" },

  // Customer rows
  custRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 11,
    borderWidth: 0.5,
    borderColor: "#D3D1C7",
    padding: 10,
    gap: 10
  },
  custRowSelected: {
    borderColor: PURPLE_MID,
    backgroundColor: PURPLE_LIGHT
  },
  avatarSm: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E1F5EE",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarSmSelected: { backgroundColor: "#CECBF6" },
  avatarSmText: { fontSize: 11, fontWeight: "600", color: "#0F6E56" },
  avatarSmTextSelected: { color: "#3C3489" },
  custRowInfo: { flex: 1 },
  custRowName: { fontSize: 14, fontWeight: "500", color: "#1A1A18" },
  custRowPhone: { fontSize: 12, color: "#888780", marginTop: 1 },
  ptsBadge: {
    backgroundColor: "#F1EFE8",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  ptsBadgeSelected: { backgroundColor: "#AFA9EC" },
  ptsBadgeText: { fontSize: 12, fontWeight: "500", color: "#5F5E5A" },
  ptsBadgeTextSelected: { color: "#26215C" },

  // New customer
  newCustCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#D3D1C7",
    padding: 14,
    gap: 8
  },
  fullInput: {
    height: 42,
    backgroundColor: "#F5F4F0",
    borderRadius: 9,
    borderWidth: 0.5,
    borderColor: "#D3D1C7",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#1A1A18"
  },
  btnCreate: {
    height: 44,
    backgroundColor: PURPLE,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2
  },
  btnCreateText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  // Transactions
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: "#D3D1C7",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  txType: { fontSize: 13, fontWeight: "500", color: "#1A1A18", textTransform: "capitalize" },
  txDate: { fontSize: 11, color: "#888780", marginTop: 2 },
  txPositive: { fontSize: 13, fontWeight: "600", color: "#0F6E56" },
  txNegative: { fontSize: 13, fontWeight: "600", color: "#993C1D" },

  mutedText: { fontSize: 13, color: "#888780" }
});
