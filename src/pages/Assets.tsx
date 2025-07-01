import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  type Asset,
} from "@/integrations/supabase/assets";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  Tag,
  Activity,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

const Assets = () => {
  const { user } = useAuth();
  const { currentProject } = useProject();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    floc: "",
    tags: "",
  });

  // Load assets from database
  const loadAssets = async () => {
    if (!currentProject?.id) {
      setAssets([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data } = await getAssets(currentProject.id);
      setAssets(data);
    } catch (error) {
      console.error("Error loading assets:", error);
      toast("Error loading assets", {
        description: "Failed to load assets from database.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [currentProject?.id]);

  // Filter assets based on search and status
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.floc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all"; // Remove status filtering since we don't have status anymore
    return matchesSearch && matchesStatus;
  });

  const handleAddAsset = () => {
    setEditingAsset(null);
    setFormData({
      name: "",
      description: "",
      floc: "",
      tags: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);

    // Extract description and tags from specifications if stored there
    const specs = (asset.specifications as any) || {};
    const description = specs.description || "";
    const tags = specs.tags
      ? Array.isArray(specs.tags)
        ? specs.tags.join(", ")
        : ""
      : "";

    setFormData({
      name: asset.name,
      description: description,
      floc: asset.location || "",
      tags: tags,
    });
    setIsDialogOpen(true);
  };

  const handleSaveAsset = async () => {
    if (!currentProject?.id) {
      toast("Error", {
        description: "Project information missing.",
      });
      return;
    }

    // Parse tags from comma-separated string
    const tagsArray = formData.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    // Store description and tags in specifications JSON
    const specifications = {
      description: formData.description,
      tags: tagsArray,
    };

    try {
      setIsSaving(true);

      if (editingAsset) {
        await updateAsset(editingAsset.id, {
          name: formData.name,
          type: formData.name, // Use name as type for consistency
          location: formData.floc || null,
          specifications: specifications,
        });
        toast("Success", {
          description: "Asset updated successfully.",
        });
      } else {
        await createAsset({
          name: formData.name,
          type: formData.name, // Use name as type for consistency
          location: formData.floc || null,
          specifications: specifications,
          project_id: currentProject.id,
        });
        toast("Success", {
          description: "Asset created successfully.",
        });
      }

      setIsDialogOpen(false);
      loadAssets(); // Reload assets
    } catch (error) {
      console.error("Error saving asset:", error);
      toast("Error", {
        description: `Failed to ${editingAsset ? "update" : "create"} asset.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      await deleteAsset(assetId);
      toast("Success", {
        description: "Asset deleted successfully.",
      });
      loadAssets(); // Reload assets
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast("Error", {
        description: "Failed to delete asset.",
      });
    }
  };

  const getStatusCount = (status: string) => {
    if (status === "all") return assets.length;
    return 0; // No status filtering anymore
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50">
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl icon-primary">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Assets
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage and track your organizational assets
                </p>
              </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddAsset} className="h-11 btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    {editingAsset ? "Edit Asset" : "Create New Asset"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingAsset
                      ? "Update the asset information below."
                      : "Add a new asset to your inventory management system."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Asset Name
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Enter asset name"
                      className="h-11"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe the asset's purpose and specifications"
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="floc" className="text-sm font-medium">
                      FLOC (Functional Location)
                    </Label>
                    <Input
                      id="floc"
                      value={formData.floc}
                      onChange={(e) =>
                        setFormData({ ...formData, floc: e.target.value })
                      }
                      placeholder="e.g., PLANT-01/LINE-A/CONV-001"
                      className="h-11 font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Hierarchical functional location identifier
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tags" className="text-sm font-medium">
                      Tags
                    </Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) =>
                        setFormData({ ...formData, tags: e.target.value })
                      }
                      placeholder="production, critical, mechanical"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate multiple tags with commas
                    </p>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="h-11"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveAsset}
                    disabled={!formData.name.trim() || isSaving}
                    className="h-11 btn-primary"
                  >
                    {isSaving && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingAsset ? "Update Asset" : "Create Asset"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Assets Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Loading assets...
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we fetch your assets
              </p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <Package className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm ? "No assets found" : "No assets yet"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Get started by creating your first asset"}
              </p>
              {!searchTerm && (
                <Button onClick={handleAddAsset} className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Asset
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      FLOC
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {filteredAssets.map((asset) => (
                    <tr
                      key={asset.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                            {asset.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {(asset.specifications as any)?.description ||
                              "No description"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {asset.location ? (
                          <span className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {asset.location}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No FLOC</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(asset.specifications as any)?.tags &&
                          Array.isArray((asset.specifications as any).tags) &&
                          (asset.specifications as any).tags.length > 0 ? (
                            <>
                              {(asset.specifications as any).tags
                                .slice(0, 2)
                                .map((tag: string, index: number) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              {(asset.specifications as any).tags.length >
                                2 && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                >
                                  +
                                  {(asset.specifications as any).tags.length -
                                    2}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">
                              No tags
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(asset.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => handleEditAsset(asset)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Asset
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteAsset(asset.id)}
                              className="text-red-600 focus:text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Asset
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Results Summary */}
        {filteredAssets.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <p>
              Showing {filteredAssets.length} of {assets.length} assets
            </p>
            <div className="flex items-center gap-2">
              <span>Total: {assets.length} assets</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assets;
