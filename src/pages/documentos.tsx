import { useEffect, useRef, useState, useCallback } from "react";
import {
  FolderOpen,
  Plus,
  Trash2,
  Download,
  Upload,
  Pencil,
  Check,
  X,
  FileText,
  FileImage,
  File as FileIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  type DocCategory,
  type DocCategoryId,
  type DocumentRecord,
  type DocumentId,
  type StorageId,
  addCategory as apiAddCategory,
  deleteCategory as apiDeleteCategory,
  deleteDocument as apiDeleteDocument,
  documentsConfigured,
  DocumentsConfigError,
  formatSize,
  getDownloadUrl,
  listCategories,
  listDocuments,
  renameCategory as apiRenameCategory,
  uploadDocument,
} from "@/lib/documentsApi";

function fileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return <FileImage className="h-5 w-5 text-blue-500" />;
  if (fileType === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
  return <FileIcon className="h-5 w-5 text-muted-foreground" />;
}

function DownloadButton({ storageId, name }: { storageId: StorageId; name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function handleClick() {
    setLoading(true);
    try {
      const link = await getDownloadUrl(storageId);
      if (!link) throw new Error("no_url");
      setUrl(link);
      // Open in a new tab to trigger download/view
      const a = document.createElement("a");
      a.href = link;
      a.download = name;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={handleClick}
      disabled={loading}
      title="Descargar"
    >
      <Download className="h-4 w-4" />
    </Button>
  );
}

export default function Documentos() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [selectedCat, setSelectedCat] = useState<DocCategoryId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Category management
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<DocCategoryId | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [deleteCatTarget, setDeleteCatTarget] = useState<DocCategoryId | null>(null);

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadModal, setUploadModal] = useState<{
    file: File;
    name: string;
    categoryId: DocCategoryId | null;
  } | null>(null);

  // Delete document
  const [deleteDocTarget, setDeleteDocTarget] = useState<{ id: DocumentId; name: string } | null>(
    null
  );

  const reloadCategories = useCallback(async () => {
    const cats = await listCategories();
    setCategories(cats);
    return cats;
  }, []);

  const reloadDocs = useCallback(async (catId: DocCategoryId | null) => {
    const list = await listDocuments(catId ?? undefined);
    setDocs(list);
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cats = await listCategories();
        if (cancelled) return;
        setCategories(cats);
        const list = await listDocuments(undefined);
        if (cancelled) return;
        setDocs(list);
      } catch (e) {
        console.error("Error cargando documentos:", e);
        if (!cancelled) {
          if (e instanceof DocumentsConfigError) {
            setError(e.message);
          } else if (!documentsConfigured) {
            setError(
              "La nube no está configurada para esta app (falta VITE_CONVEX_URL)."
            );
          } else {
            const msg = e instanceof Error ? e.message : String(e);
            setError(
              "No se pudieron cargar los documentos. Verifica tu conexión.\n\nDetalle: " +
                msg
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reload docs when category changes
  useEffect(() => {
    if (loading) return;
    reloadDocs(selectedCat).catch((e) => {
      console.error("Error recargando documentos:", e);
    });
  }, [selectedCat, loading, reloadDocs]);

  async function handleAddCategory() {
    const name = newCatName.trim();
    if (!name) return;
    try {
      const id = await apiAddCategory(name);
      setNewCatName("");
      setAddingCat(false);
      const cats = await reloadCategories();
      const created = cats.find((c) => c._id === id);
      if (created) setSelectedCat(created._id);
      toast({ title: "Categoría creada", description: name });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo crear la categoría", variant: "destructive" });
    }
  }

  async function handleRenameCategory() {
    if (!editingCatId || !editingCatName.trim()) return;
    try {
      await apiRenameCategory(editingCatId, editingCatName.trim());
      setEditingCatId(null);
      await reloadCategories();
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo renombrar", variant: "destructive" });
    }
  }

  async function confirmDeleteCategory() {
    if (!deleteCatTarget) return;
    try {
      if (selectedCat === deleteCatTarget) setSelectedCat(null);
      await apiDeleteCategory(deleteCatTarget);
      setDeleteCatTarget(null);
      await reloadCategories();
      await reloadDocs(null);
      toast({ title: "Categoría eliminada" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  }

  async function handleUploadFromInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadModal({ file: files[0], name: files[0].name, categoryId: selectedCat });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleConfirmUpload() {
    if (!uploadModal || !uploadModal.categoryId) return;
    setUploading(true);
    try {
      await uploadDocument(uploadModal.file, uploadModal.name, uploadModal.categoryId);
      const target = uploadModal.categoryId;
      setUploadModal(null);
      await reloadDocs(selectedCat ?? null);
      // If we uploaded into the currently visible category (or "todas"), refresh works.
      // Else jump to that category so user sees it
      if (selectedCat && selectedCat !== target) {
        setSelectedCat(target);
      }
      toast({ title: "Archivo subido" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo subir el archivo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function confirmDeleteDocument() {
    if (!deleteDocTarget) return;
    try {
      await apiDeleteDocument(deleteDocTarget.id);
      setDeleteDocTarget(null);
      await reloadDocs(selectedCat);
      toast({ title: "Documento eliminado" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  }

  const activeCatName =
    categories.find((c) => c._id === selectedCat)?.name ?? "Todas las categorías";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-semibold">Documentos</h1>
        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || categories.length === 0}
          title={
            categories.length === 0
              ? "Crea una categoría primero"
              : "Subir archivo"
          }
        >
          <Upload className="h-4 w-4 mr-1.5" />
          {uploading ? "Subiendo..." : "Subir archivo"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleUploadFromInput}
        />
      </div>

      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        {/* Sidebar / dropdown de categorías */}
        <Card className="md:w-60 md:shrink-0">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Categorías
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setAddingCat(true)}
                title="Nueva categoría"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile: select rápido */}
            <div className="md:hidden">
              <Select
                value={selectedCat ?? "__all"}
                onValueChange={(v) =>
                  setSelectedCat(v === "__all" ? null : (v as DocCategoryId))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Todas las categorías</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Desktop: lista */}
            <div className="hidden md:flex md:flex-col md:gap-0.5">
              <button
                onClick={() => setSelectedCat(null)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                  selectedCat === null
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <FolderOpen className="h-4 w-4" />
                <span>Todas</span>
              </button>

              {categories.map((cat) => (
                <div key={cat._id} className="group relative">
                  {editingCatId === cat._id ? (
                    <div className="flex items-center gap-1 px-1 py-0.5">
                      <Input
                        autoFocus
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleRenameCategory();
                          if (e.key === "Escape") setEditingCatId(null);
                        }}
                        className="h-7 text-sm flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-green-600"
                        onClick={() => void handleRenameCategory()}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEditingCatId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedCat(cat._id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
                        selectedCat === cat._id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <FolderOpen className="h-4 w-4 shrink-0" />
                      <span className="truncate flex-1">{cat.name}</span>
                      <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCatId(cat._id);
                            setEditingCatName(cat.name);
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground rounded"
                          title="Renombrar"
                        >
                          <Pencil className="h-3 w-3" />
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteCatTarget(cat._id);
                          }}
                          className="p-1 text-muted-foreground hover:text-destructive rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </span>
                      </span>
                    </button>
                  )}
                </div>
              ))}

              {addingCat && (
                <div className="flex items-center gap-1 px-1 py-0.5">
                  <Input
                    autoFocus
                    placeholder="Nombre..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleAddCategory();
                      if (e.key === "Escape") {
                        setAddingCat(false);
                        setNewCatName("");
                      }
                    }}
                    className="h-7 text-sm flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-green-600"
                    onClick={() => void handleAddCategory()}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setAddingCat(false);
                      setNewCatName("");
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile: nueva categoría inline */}
            <div className="md:hidden">
              {addingCat ? (
                <div className="flex items-center gap-1 mt-1.5">
                  <Input
                    autoFocus
                    placeholder="Nombre de categoría..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleAddCategory();
                      if (e.key === "Escape") {
                        setAddingCat(false);
                        setNewCatName("");
                      }
                    }}
                    className="h-9 text-sm flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-green-600"
                    onClick={() => void handleAddCategory()}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => {
                      setAddingCat(false);
                      setNewCatName("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs h-7 px-2"
                  onClick={() => setAddingCat(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Nueva categoría
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de documentos */}
        <Card className="flex-1 min-w-0">
          <CardContent className="p-3 md:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground">{activeCatName}</h2>
              <span className="text-xs text-muted-foreground">
                {docs.length} {docs.length === 1 ? "archivo" : "archivos"}
              </span>
            </div>

            {loading && (
              <div className="text-center text-muted-foreground py-12 text-sm">
                Cargando documentos...
              </div>
            )}

            {!loading && categories.length === 0 && (
              <div className="text-center text-muted-foreground py-12 text-sm">
                <FolderOpen className="mx-auto mb-3 opacity-30 h-10 w-10" />
                <p className="font-medium">Aún no hay categorías</p>
                <p className="text-xs mt-1 opacity-70">
                  Crea una categoría primero para organizar tus documentos
                </p>
              </div>
            )}

            {!loading && categories.length > 0 && docs.length === 0 && (
              <div className="text-center text-muted-foreground py-12 text-sm">
                <Upload className="mx-auto mb-3 opacity-30 h-10 w-10" />
                <p>No hay documentos en {selectedCat ? "esta categoría" : "ninguna categoría"}</p>
                <p className="text-xs mt-1">
                  Haz clic en "Subir archivo" para agregar
                </p>
              </div>
            )}

            <div className="space-y-2">
              {docs.map((doc) => {
                const catName = categories.find((c) => c._id === doc.categoryId)?.name;
                return (
                  <div
                    key={doc._id}
                    className="flex items-center gap-3 bg-muted/30 border border-border rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors"
                  >
                    {fileIcon(doc.fileType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {!selectedCat && catName && (
                          <span className="mr-2 text-primary">{catName}</span>
                        )}
                        {formatSize(doc.fileSize)} · {doc.uploadedAt.slice(0, 10)}
                      </p>
                    </div>
                    <DownloadButton storageId={doc.storageId} name={doc.name} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteDocTarget({ id: doc._id, name: doc.name })}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal subida */}
      <Dialog open={!!uploadModal} onOpenChange={(o) => !o && setUploadModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Subir archivo</DialogTitle>
          </DialogHeader>
          {uploadModal && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground bg-muted rounded px-3 py-2 truncate">
                {uploadModal.file.name} · {formatSize(uploadModal.file.size)}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="doc-name">Nombre del documento</Label>
                <Input
                  id="doc-name"
                  autoFocus
                  value={uploadModal.name}
                  onChange={(e) =>
                    setUploadModal((m) => (m ? { ...m, name: e.target.value } : m))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                {categories.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Crea una categoría primero
                  </p>
                ) : (
                  <Select
                    value={uploadModal.categoryId ?? ""}
                    onValueChange={(v) =>
                      setUploadModal((m) =>
                        m ? { ...m, categoryId: v as DocCategoryId } : m
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModal(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleConfirmUpload()}
              disabled={uploading || !uploadModal?.categoryId}
            >
              {uploading ? "Subiendo..." : "Subir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar categoría */}
      <AlertDialog
        open={!!deleteCatTarget}
        onOpenChange={(o) => !o && setDeleteCatTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los documentos dentro de esta categoría. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteCategory()}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar eliminar documento */}
      <AlertDialog
        open={!!deleteDocTarget}
        onOpenChange={(o) => !o && setDeleteDocTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el archivo "{deleteDocTarget?.name ?? ""}". Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteDocument()}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
