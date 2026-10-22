'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recipesApi } from '@/apis/dolores/recipes.api';
import type { RecipePublishRequest } from '@/types/dolores/recipes';
import { retryDoloresRead } from './queryPolicy';

export const globalRecipeQueryKeys = {
  all: ['dolores', 'recipes', 'global'] as const,
  list: () => [...globalRecipeQueryKeys.all, 'list'] as const,
  detail: (id: string | null) => [...globalRecipeQueryKeys.all, 'detail', id] as const,
};

export function useGlobalRecipes(enabled = true) {
  return useQuery({
    queryKey: globalRecipeQueryKeys.list(),
    queryFn: ({ signal }) => recipesApi.listGlobal(signal),
    enabled,
    retry: retryDoloresRead,
  });
}

export function useGlobalRecipe(id: string | null) {
  return useQuery({
    queryKey: globalRecipeQueryKeys.detail(id),
    queryFn: ({ signal }) => {
      if (!id) throw new Error('A global recipe ID is required.');
      return recipesApi.getGlobalById(id, signal);
    },
    enabled: Boolean(id),
    retry: retryDoloresRead,
  });
}

export function usePublishGlobalRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RecipePublishRequest) => recipesApi.publishGlobal(input),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: globalRecipeQueryKeys.all });
    },
  });
}
