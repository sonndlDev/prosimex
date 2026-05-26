import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  timeout: 15000,
});

// Decode JWT payload without a library
const parseJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

// Check if token expires within the next 5 minutes
const isTokenExpiringSoon = (token) => {
  const payload = parseJwt(token);
  if (!payload?.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - now < 300; // 5 minutes buffer
};

// Proactive refresh — refresh token before it expires
let proactiveRefreshPromise = null;

const proactiveRefresh = async () => {
  if (proactiveRefreshPromise) return proactiveRefreshPromise;

  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  proactiveRefreshPromise = axios
    .post(`${import.meta.env.VITE_API_URL}/api/auth/refresh-token`, {
      refreshToken,
    })
    .then(({ data }) => {
      localStorage.setItem("token", data.token);
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        window.dispatchEvent(new CustomEvent("auth:user-updated", { detail: data.user }));
      }
      return data.token;
    })
    .catch(() => {
      return null; // Let the 401 interceptor handle the failure
    })
    .finally(() => {
      proactiveRefreshPromise = null;
    });

  return proactiveRefreshPromise;
};

api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem("token");

  // Proactively refresh if token is about to expire (skip for refresh-token endpoint itself)
  if (
    token &&
    isTokenExpiringSoon(token) &&
    !config.url?.includes("refresh-token")
  ) {
    const newToken = await proactiveRefresh();
    if (newToken) token = newToken;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/auth/refresh-token`,
            { refreshToken },
          );
          const { token, user: refreshedUser } = data;

          localStorage.setItem("token", token);
          if (refreshedUser) {
            localStorage.setItem("user", JSON.stringify(refreshedUser));
            window.dispatchEvent(new CustomEvent("auth:user-updated", { detail: refreshedUser }));
          }
          api.defaults.headers.common["Authorization"] = "Bearer " + token;
          originalRequest.headers["Authorization"] = "Bearer " + token;

          processQueue(null, token);
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    // 403 Forbidden — permission denied
    if (error.response?.status === 403) {
      const data = error.response?.data || {};
      const message = data.message || "Bạn không có quyền thực hiện thao tác này";
      const required_permission = data.required_permission || null;
      window.dispatchEvent(new CustomEvent("api:forbidden", { detail: { message, required_permission } }));
    }

    return Promise.reject(error);
  },
);

export default api;
