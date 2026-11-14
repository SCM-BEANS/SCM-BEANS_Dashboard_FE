export async function readAllPages<T>(read: (page: number) => Promise<{ items: T[]; hasNext: boolean }>): Promise<T[]> {
  const items: T[] = [];
  for (let page = 0; ; page += 1) {
    const result = await read(page);
    items.push(...result.items);
    if (!result.hasNext) return items;
    if (!result.items.length) throw new Error("Không thể tải đầy đủ danh sách. Vui lòng thử lại.");
  }
}
