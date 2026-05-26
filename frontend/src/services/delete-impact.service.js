import api from "./api";

export const deleteImpactService = {
  get: async (entity, id) => {
    const { data } = await api.get(`/delete-impact/${entity}/${id}`);
    return data;
  },
  getBulk: async (entity, ids) => {
    const { data } = await api.post("/delete-impact/bulk", { entity, ids });
    return data;
  },
};
