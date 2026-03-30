const [users, setUsers] = useState([]);
const [selectedUserId, setSelectedUserId] = useState("");
useEffect(() => {
    async function loadUsers() {
      if (isLocalMode()) {
        setUsers([
          {
            id: "1",
            full_name: localDisplayName(),
            email: "demo@local",
            role: "employee",
            created_at: new Date().toISOString(),
          },
        ]);
        return;
      }
  
      const { data, error } = await supabase.from("users").select("*").order("full_name", { ascending: true });
  
      if (error) {
        console.error(error);
        return;
      }
  
      setUsers(data || []);
    }
  
    loadUsers();
  }, []);
