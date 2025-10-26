import { useCallback } from 'react';

/**
 * Hook for performing optimistic UI updates with automatic rollback on error
 *
 * Allows you to update the UI immediately while the API call is in progress,
 * then sync with the server response or rollback on error.
 *
 * @param items - The current array of items
 * @param setItems - The state setter for items
 * @param refreshFunction - Function to refresh data on error
 *
 * @example
 * const [exercises, setExercises] = useState([]);
 * const { optimisticUpdate } = useOptimisticUpdate(exercises, setExercises, refetch);
 *
 * const handleVote = async (id: string, voteValue: number) => {
 *   await optimisticUpdate(
 *     id,
 *     // Optimistic update function
 *     (exercise) => ({
 *       ...exercise,
 *       user_vote: voteValue,
 *       vote_count: exercise.vote_count + voteValue
 *     }),
 *     // API call
 *     () => voteExercise(id, voteValue)
 *   );
 * };
 */
export function useOptimisticUpdate<T extends { id: string }>(
  items: T[],
  setItems: React.Dispatch<React.SetStateAction<T[]>>,
  refreshFunction: () => void
) {
  /**
   * Perform an optimistic update on a single item
   */
  const optimisticUpdate = useCallback(
    async (id: string, optimisticUpdateFn: (item: T) => T, apiCall: () => Promise<T>) => {
      // Step 1: Apply optimistic update immediately
      setItems((prev) => prev.map((item) => (item.id === id ? optimisticUpdateFn(item) : item)));

      try {
        // Step 2: Make the actual API call
        const result = await apiCall();

        // Step 3: Update with server response to ensure consistency
        setItems((prev) => prev.map((item) => (item.id === id ? result : item)));

        return result;
      } catch (err) {
        // Step 4: Rollback on error by refreshing from server
        console.error('Optimistic update failed, rolling back:', err);
        refreshFunction();
        throw err;
      }
    },
    [setItems, refreshFunction]
  );

  /**
   * Perform an optimistic deletion
   */
  const optimisticDelete = useCallback(
    async (id: string, apiCall: () => Promise<void>) => {
      // Save the item in case we need to rollback
      const itemToDelete = items.find((item) => item.id === id);

      // Step 1: Optimistically remove from UI
      setItems((prev) => prev.filter((item) => item.id !== id));

      try {
        // Step 2: Make the actual API call
        await apiCall();
      } catch (err) {
        // Step 3: Rollback on error
        console.error('Optimistic delete failed, rolling back:', err);
        if (itemToDelete) {
          setItems((prev) => [...prev, itemToDelete]);
        } else {
          refreshFunction();
        }
        throw err;
      }
    },
    [items, setItems, refreshFunction]
  );

  /**
   * Perform an optimistic addition
   */
  const optimisticAdd = useCallback(
    async (tempItem: T, apiCall: () => Promise<T>) => {
      // Step 1: Add temporary item to UI
      setItems((prev) => [...prev, tempItem]);

      try {
        // Step 2: Make the actual API call
        const result = await apiCall();

        // Step 3: Replace temp item with server response
        setItems((prev) => prev.map((item) => (item.id === tempItem.id ? result : item)));

        return result;
      } catch (err) {
        // Step 4: Remove temp item on error
        console.error('Optimistic add failed, rolling back:', err);
        setItems((prev) => prev.filter((item) => item.id !== tempItem.id));
        throw err;
      }
    },
    [setItems]
  );

  return {
    optimisticUpdate,
    optimisticDelete,
    optimisticAdd,
  };
}
