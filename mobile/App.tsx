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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
						
          <View style={styles.header}>
            <Text style={styles.kicker}>Loyalty desk</Text>
            <Text style={styles.title}>Customers</Text>
          </View>
					
          <View style={styles.searchBox}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => loadCustomers(search)}
              placeholder="Search by name or phone"
              returnKeyType="search"
              style={styles.searchInput}
											
            />
            <Pressable style={styles.searchButton} onPress={() => loadCustomers(search)}>
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>									
          {selectedCustomer ? (
            <View style={styles.balanceCard}>
              <View>
                <Text style={styles.customerNameLarge}>{selectedCustomer.name}</Text>
                <Text style={styles.customerPhone}>{selectedCustomer.phone}</Text>
              </View>
              <View style={styles.balancePill}>
                <Text style={styles.balanceNumber}>{selectedCustomer.balance}</Text>
                <Text style={styles.balanceLabel}>points</Text>
              </View>		
            </View>
          ) : (
            <View style={styles.emptySelection}>
              <Text style={styles.emptyTitle}>Select a customer</Text>
              <Text style={styles.emptyText}>
                Search or create a customer, then earn or redeem points.
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Point action</Text>
            <View style={styles.actionRow}>
              <TextInput
                value={purchaseAmount}
                onChangeText={setPurchaseAmount}
                placeholder="Purchase amount"
                keyboardType="numeric"
                style={styles.actionInput}
              />
              <Pressable
						   
                style={[styles.primaryButton, !canEarn && styles.disabledButton]}
                onPress={earnPoints}
                disabled={!canEarn}
              >							
                <Text style={styles.primaryButtonText}>Earn</Text>
              </Pressable>				 
            </View>

            <View style={styles.actionRow}>			 
												 
              <TextInput
                value={redeemPoints}
                onChangeText={setRedeemPoints}
                placeholder="Redeem points"
                keyboardType="numeric"
                style={styles.actionInput}
													
              />
              <Pressable
                style={[styles.outlineButton, !canRedeem && styles.disabledButton]}
                onPress={redeem}
                disabled={!canRedeem}
              >
                <Text style={styles.outlineButtonText}>Redeem</Text>
              </Pressable>
						 
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent customers</Text>
              {loading ? <ActivityIndicator size="small" /> : null}
            </View>
            {customers.map((item) => (
              <Pressable
                key={item.id}
                style={[
                  styles.customerRow,
                  selectedCustomer?.id === item.id && styles.selectedRow
                ]}
                onPress={() => selectCustomer(item)}
              >
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  <Text style={styles.muted}>{item.phone}</Text>
                </View>
                <Text style={styles.points}>{item.balance} pts</Text>
              </Pressable>
            ))}
          </View>
					
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New customer</Text>
										   
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Customer name"
              style={styles.fullInput}
											
            />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              keyboardType="phone-pad"
              style={styles.fullInput}
											
            />
            <Pressable
              style={[styles.primaryButtonWide, !canCreate && styles.disabledButton]}
              onPress={createCustomer}
              disabled={!canCreate}
            >
              <Text style={styles.primaryButtonText}>Create customer</Text>
            </Pressable>
          </View>
          {selectedCustomer ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>History</Text>
              {transactions.length ? (
				   
                transactions.slice(0, 8).map((item) => (
                  <View key={item.id} style={styles.transactionRow}>
                    <View>
                      <Text style={styles.transactionType}>{item.type}</Text>
                      <Text style={styles.muted}>{formatDate(item.created_at)}</Text>
                    </View>
                    <Text style={item.points > 0 ? styles.positive : styles.negative}>
                      {item.points > 0 ? "+" : ""}
                      {item.points} pts
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No point history yet.</Text>
              )}
            </View>
          ) : null}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f6f8"
  },
  content: {
    padding: 16,
				   
    paddingBottom: 32,
    gap: 16
  },
  header: {
    gap: 4
  },  
							  
  kicker: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    color: "#0f172a",
    fontSize: 32,
    fontWeight: "800"
  },
  searchBox: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe1e8",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    padding: 6
  },  
											  
  searchInput: {
    flex: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 10
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: "#0f766e",
    borderRadius: 6,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16
  },
  searchButtonText: {
    color: "#ffffff",
    fontWeight: "800"
  },
  balanceCard: {
    alignItems: "center",
    backgroundColor: "#102a43",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18
  },
  customerNameLarge: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800"
  },
  customerPhone: {
    color: "#cbd5e1",
    fontSize: 15,
    marginTop: 4
  },
  balancePill: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    minWidth: 88,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  balanceNumber: {
    color: "#0f766e",
    fontSize: 24,
    fontWeight: "900"
  },
  balanceLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700"
  },
  emptySelection: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe1e8",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16
							
  },
  emptyTitle: {
    color: "#0f172a",						
    fontSize: 18,
    fontWeight: "800"
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4
  },
  section: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe1e8",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: "#1e293b",
    fontSize: 17,
    fontWeight: "800"
  },
  actionRow: {
    flexDirection: "row",
    gap: 8
								
  },
  actionInput: {
    backgroundColor: "#f8fafc",
    borderColor: "#dbe1e8",
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 12
  },
  fullInput: {
    backgroundColor: "#f8fafc",
    borderColor: "#dbe1e8",
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 12
  },
  primaryButton: {		 
    alignItems: "center",
    backgroundColor: "#0f766e",
    borderRadius: 6,
    justifyContent: "center",
    minHeight: 50,
    minWidth: 92,
    paddingHorizontal: 14
					
  },
  primaryButtonWide: {
    alignItems: "center",
    backgroundColor: "#0f766e",
    borderRadius: 6,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 14
  },
  outlineButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#0f766e",
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
    minWidth: 92,
    paddingHorizontal: 14
  },
  disabledButton: {
    opacity: 0.45
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800"
  },
  outlineButtonText: {
    color: "#0f766e",
    fontWeight: "800"
  },
  customerRow: {
    alignItems: "center",
    borderColor: "#edf2f7",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 66,
    paddingHorizontal: 12
  },
  selectedRow: {
    backgroundColor: "#ecfdf5",
    borderColor: "#0f766e"
  },
  customerInfo: {
    flex: 1,
    paddingRight: 8
  },
  customerName: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800"
  },
  muted: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 3
  },
  points: {
    color: "#0f766e",
    fontSize: 15,
    fontWeight: "900"
  },
  transactionRow: {
    alignItems: "center",
    borderTopColor: "#edf2f7",
    borderTopWidth: 1,
    flexDirection: "row",						 
    justifyContent: "space-between",
    paddingVertical: 10
  },
  transactionType: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  positive: {
    color: "#047857",
    fontSize: 15,
    fontWeight: "900"
  },
  negative: {
    color: "#b91c1c",
    fontSize: 15,
    fontWeight: "900"	
  }
});
