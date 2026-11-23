"use client";

import { useState, useTransition } from "react";
import { Check, ClipboardCopy, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import {
  addGroceryItem,
  clearBoughtItems,
  removeGroceryItem,
  setGroceryChecked,
} from "./actions";

type Item = {
  id: string;
  name: string;
  forRecipes: string[];
  checked: boolean; // true = bought
};

export default function GroceryList({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [newItem, setNewItem] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [adding, startAdding] = useTransition();
  const [, startTransition] = useTransition();

  const toBuy = items.filter((i) => !i.checked);
  const bought = items.filter((i) => i.checked);
  const percent = items.length ? Math.round((bought.length / items.length) * 100) : 0;

  // Change the screen right away, then save. If saving fails, put it back.
  function save(change: () => Promise<unknown>, undo: () => void) {
    setError("");
    startTransition(async () => {
      try {
        await change();
      } catch {
        undo();
        setError("Could not save, try again.");
      }
    });
  }

  function toggle(item: Item) {
    const checked = !item.checked;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked } : i)));
    save(
      () => setGroceryChecked(item.id, checked),
      () => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: item.checked } : i))),
    );
  }

  function remove(item: Item) {
    const before = items;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    save(() => removeGroceryItem(item.id), () => setItems(before));
  }

  function clearBought() {
    const before = items;
    setItems((prev) => prev.filter((i) => !i.checked));
    save(() => clearBoughtItems(), () => setItems(before));
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const name = newItem.trim();
    if (!name) return;
    setError("");
    startAdding(async () => {
      try {
        const row = await addGroceryItem(name);
        if (row) {
          setItems((prev) => [...prev.filter((i) => i.id !== row.id), row]);
          setNewItem("");
        }
      } catch {
        setError("Could not add it, try again.");
      }
    });
  }

  async function copyList() {
    const text =
      toBuy.length > 0
        ? `Grocery list\n${toBuy.map((i) => `☐ ${i.name}`).join("\n")}`
        : "Grocery list: nothing left to buy!";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not allowed: do nothing
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white border border-black/5 shadow-sm">
      {/* Header */}
      <div className="bg-[#101814] p-6 text-white">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ShoppingCart className="h-5 w-5 text-[#E6F4EA]" />
            Grocery list
          </h2>
          {toBuy.length > 0 && (
            <button
              type="button"
              onClick={copyList}
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
        <div className="mt-4 flex items-end justify-between text-sm">
          <span>
            <span className="text-3xl font-semibold">{toBuy.length}</span>
            <span className="ml-1.5 text-white/70">to buy</span>
          </span>
          <span className="text-white/70">{percent}% done</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-[#E6F4EA] transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="p-6">
        {/* Add your own item */}
        <form onSubmit={add} className="flex gap-2">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add an item, e.g. milk"
            maxLength={80}
            className="min-w-0 flex-1 rounded-xl border border-[#101814]/15 px-4 py-2 text-sm outline-none transition placeholder:text-[#101814]/40 focus:border-[#1F8A4C] focus:ring-2 focus:ring-[#E6F4EA]"
          />
          <button
            type="submit"
            disabled={adding || !newItem.trim()}
            aria-label="Add item"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6F4EA] text-[#101814] transition hover:bg-[#CDEBD6] disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        {items.length === 0 ? (
          <div className="mt-5 rounded-xl bg-[#FAFAF8] p-6 text-center">
            <ShoppingCart className="mx-auto h-8 w-8 text-[#101814]/20" />
            <p className="mt-2 text-sm text-[#101814]/60">
              Your list is empty. Open a recipe and untick what you don&apos;t have to add it here.
            </p>
          </div>
        ) : (
          <>
            {/* To buy */}
            <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-amber-700">
              To buy · {toBuy.length}
            </h3>
            {toBuy.length === 0 ? (
              <p className="mt-2 rounded-xl bg-[#E6F4EA]/40 p-4 text-center text-sm font-medium text-[#101814]">
                🎉 You got everything!
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {toBuy.map((item) => (
                  <Row key={item.id} item={item} onToggle={toggle} onRemove={remove} />
                ))}
              </ul>
            )}

            {/* Bought */}
            {bought.length > 0 && (
              <>
                <div className="mt-6 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#101814]/50">
                    In your basket · {bought.length}
                  </h3>
                  <button
                    type="button"
                    onClick={clearBought}
                    className="flex items-center gap-1 text-xs font-medium text-[#101814]/50 transition hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </button>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {bought.map((item) => (
                    <Row key={item.id} item={item} onToggle={toggle} onRemove={remove} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({
  item,
  onToggle,
  onRemove,
}: {
  item: Item;
  onToggle: (item: Item) => void;
  onRemove: (item: Item) => void;
}) {
  return (
    <li className="group flex items-center gap-1 rounded-xl ring-1 ring-[#101814]/5 transition hover:bg-[#FAFAF8]/60">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2.5">
        <input type="checkbox" checked={item.checked} onChange={() => onToggle(item)} className="peer sr-only" />
        {/* custom checkbox */}
        <span
          aria-hidden
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-xl border-2 transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#1F8A4C] ${
            item.checked ? "border-[#1F8A4C] bg-[#1F8A4C]" : "border-[#101814]/25 bg-white"
          }`}
        >
          {item.checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
        </span>
        <span className="min-w-0">
          <span
            className={`block text-sm capitalize transition ${
              item.checked ? "text-[#101814]/40 line-through" : "font-medium text-[#101814]"
            }`}
          >
            {item.name}
          </span>
          {item.forRecipes.length > 0 && (
            <span className="block truncate text-xs text-[#101814]/50">for {item.forRecipes.join(", ")}</span>
          )}
        </span>
      </label>
      <button
        type="button"
        onClick={() => onRemove(item)}
        aria-label={`Remove ${item.name}`}
        className="mr-2 rounded-full p-1.5 text-[#101814]/30 transition hover:bg-white hover:text-red-600"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}
