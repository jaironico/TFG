// src/components/Admin.jsx
import React, { useEffect, useState } from "react";

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState(null);

  const token = localStorage.getItem("token");

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const meRes = await fetch(`${API_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const me = await meRes.json();
        if (!me.is_admin) {
          window.location.href = "/";
          return;
        }
        setAdminId(me.id);

        const res = await fetch(`${API_BASE}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error("Error cargando usuarios:", err);
        window.location.href = "/";
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token]);

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este usuario?")) return;
    try {
      await fetch(`${API_BASE}/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert("Error eliminando usuario");
    }
  };

  const handleLogout = () => {
    if (window.confirm("¿Cerrar sesión?")) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }
  };

  if (loading) return <p style={{ textAlign: "center" }}>Cargando...</p>;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center", // Solo horizontal
        background: "#181818",
      }}
    >
      <h1 className="text-2xl font-bold mb-4" style={{ color: "#fff" }}>
        Panel de Administración
      </h1>
      <button
        onClick={handleLogout}
        className="bg-gray-800 text-white px-4 py-2 rounded mb-6 hover:bg-gray-700"
        style={{ marginBottom: "24px" }}
      >
        🚪 Cerrar Sesión
      </button>
      <table
        className="table-auto border"
        style={{
          maxWidth: "800px",
          background: "#232323",
          color: "#fff",
          borderCollapse: "separate",
          borderSpacing: "0 8px", // añade espacio entre filas
        }}
      >
        <thead>
          <tr className="bg-gray-800 text-white">
            <th style={{ padding: "12px 32px" }}>ID</th>
            <th style={{ padding: "12px 32px" }}>Username</th>
            <th style={{ padding: "12px 32px" }}>Admin</th>
            <th style={{ padding: "12px 32px" }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t text-center">
              <td style={{ padding: "12px 32px" }}>{u.id}</td>
              <td style={{ padding: "12px 32px" }}>{u.username}</td>
              <td style={{ padding: "12px 32px" }}>{u.is_admin ? "✔️" : "❌"}</td>
              <td style={{ padding: "12px 32px" }}>
                {u.id !== adminId && (
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Admin;