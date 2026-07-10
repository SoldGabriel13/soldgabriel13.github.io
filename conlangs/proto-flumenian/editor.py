import json
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

FIELDS = [
    "Lemma",
    "Gloss",
    "IPA",
    "pos",
    "Etymology",
    "Notes",
    "Tags",
    "Related Words"
]


class LexiconEditor:

    def __init__(self, root):
        self.root = root
        self.root.title("Lexicon Editor")
        self.root.geometry("1200x700")

        self.filename = None
        self.data = []

        # ---------- Left ----------
        left = ttk.Frame(root)
        left.pack(side="left", fill="y")

        self.search = tk.StringVar()
        search_entry = ttk.Entry(left, textvariable=self.search)
        search_entry.pack(fill="x", padx=5, pady=5)
        search_entry.bind("<KeyRelease>", self.refresh_list)

        self.listbox = tk.Listbox(left, width=35)
        self.listbox.pack(fill="both", expand=True, padx=5)
        self.listbox.bind("<<ListboxSelect>>", self.select_entry)

        ttk.Button(left, text="Add", command=self.add_entry).pack(fill="x", padx=5, pady=2)
        ttk.Button(left, text="Delete", command=self.delete_entry).pack(fill="x", padx=5, pady=2)
        ttk.Button(left, text="Save", command=self.save).pack(fill="x", padx=5, pady=2)

        # ---------- Right ----------
        right = ttk.Frame(root)
        right.pack(side="left", fill="both", expand=True)

        self.widgets = {}

        for field in FIELDS:

            ttk.Label(right, text=field).pack(anchor="w", padx=5)

            if field in ["Notes", "Etymology"]:

                txt = tk.Text(right, height=5)
                txt.pack(fill="x", padx=5, pady=(0,5))
                self.widgets[field] = txt

            elif field == "pos":

                combo = ttk.Combobox(
                    right,
                    values=[
                        "noun",
                        "verb",
                        "adj",
                        "adv",
                        "pron",
                        "prep",
                        "conj",
                        "part",
                        "affix",
                        "num"
                    ]
                )
                combo.pack(fill="x", padx=5, pady=(0,5))
                self.widgets[field] = combo

            else:

                ent = ttk.Entry(right)
                ent.pack(fill="x", padx=5, pady=(0,5))
                self.widgets[field] = ent

        menubar = tk.Menu(root)
        filemenu = tk.Menu(menubar, tearoff=0)
        filemenu.add_command(label="Open", command=self.open_file)
        filemenu.add_command(label="Save", command=self.save)
        menubar.add_cascade(label="File", menu=filemenu)
        root.config(menu=menubar)

    def open_file(self):
        filename = filedialog.askopenfilename(filetypes=[("JSON","*.json")])
        if not filename:
            return

        self.filename = filename

        with open(filename,"r",encoding="utf-8") as f:
            self.data = json.load(f)

        self.refresh_list()

    def refresh_list(self, event=None):

        q = self.search.get().lower()

        self.listbox.delete(0, tk.END)

        self.filtered = []

        for i, item in enumerate(self.data):

            text = f"{item.get('Lemma','')} — {item.get('Gloss','')}"

            if q in text.lower():

                self.filtered.append(i)
                self.listbox.insert(tk.END, text)

    def select_entry(self, event):

        if not self.listbox.curselection():
            return

        real = self.filtered[self.listbox.curselection()[0]]

        self.current = real

        item = self.data[real]

        for field in FIELDS:

            widget = self.widgets[field]

            value = item.get(field,"")

            if isinstance(widget, tk.Text):

                widget.delete("1.0",tk.END)
                widget.insert("1.0",value)

            else:

                widget.delete(0,tk.END)
                widget.insert(0,value)

    def update_current(self):

        if not hasattr(self,"current"):
            return

        item = self.data[self.current]

        for field in FIELDS:

            widget = self.widgets[field]

            if isinstance(widget, tk.Text):

                value = widget.get("1.0","end").rstrip()

            else:

                value = widget.get()

            item[field] = value

    def add_entry(self):

        self.update_current()

        self.data.append({k:"" for k in FIELDS})

        self.refresh_list()

    def delete_entry(self):

        if not hasattr(self,"current"):
            return

        if messagebox.askyesno("Delete","Delete this entry?"):

            del self.data[self.current]
            self.refresh_list()

    def save(self):

        self.update_current()

        if not self.filename:

            self.filename = filedialog.asksaveasfilename(
                defaultextension=".json"
            )

        with open(self.filename,"w",encoding="utf-8") as f:

            json.dump(
                self.data,
                f,
                ensure_ascii=False,
                indent=2
            )

        messagebox.showinfo("Saved","Lexicon saved.")


root = tk.Tk()
LexiconEditor(root)
root.mainloop()