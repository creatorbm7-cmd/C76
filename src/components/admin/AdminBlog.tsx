import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, X } from "lucide-react";

const CATEGORIES = [
  "crypto", "how-to-guides", "esports", "stake-news",
  "challenges", "sport", "poker", "casino", "other",
];

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  category: string;
  cover_image_url: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
}

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  // Form state
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    category: "other",
    cover_image_url: "",
    status: "draft",
  });

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load posts");
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", slug: "", excerpt: "", content: "", category: "other", cover_image_url: "", status: "draft" });
    setCreating(true);
  };

  const openEdit = (post: BlogPost) => {
    setCreating(false);
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content || "",
      category: post.category,
      cover_image_url: post.cover_image_url || "",
      status: post.status,
    });
  };

  const closeForm = () => {
    setEditing(null);
    setCreating(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    const slug = form.slug || generateSlug(form.title);
    const payload = {
      title: form.title.trim(),
      slug,
      excerpt: form.excerpt.trim() || null,
      content: form.content.trim() || null,
      category: form.category,
      cover_image_url: form.cover_image_url.trim() || null,
      status: form.status,
      published_at: form.status === "published" ? new Date().toISOString() : null,
    };

    if (editing) {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", editing.id);
      if (error) {
        toast.error("Failed to update: " + error.message);
      } else {
        toast.success("Post updated");
        closeForm();
        fetchPosts();
      }
    } else {
      const { error } = await supabase.from("blog_posts").insert(payload);
      if (error) {
        toast.error("Failed to create: " + error.message);
      } else {
        toast.success("Post created");
        closeForm();
        fetchPosts();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Post deleted");
      fetchPosts();
    }
  };

  const toggleStatus = async (post: BlogPost) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("blog_posts")
      .update({
        status: newStatus,
        published_at: newStatus === "published" ? new Date().toISOString() : null,
      })
      .eq("id", post.id);
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(newStatus === "published" ? "Post published" : "Post unpublished");
      fetchPosts();
    }
  };

  const showForm = creating || editing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">📝 Blog Management</h2>
          <p className="text-xs text-white/30 mt-0.5">{posts.length} posts</p>
        </div>
        {!showForm && (
          <Button onClick={openCreate} size="sm" className="casino-gold-gradient text-black font-semibold text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> New Post
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      {!showForm && (
        <div className="flex gap-2">
          {(["all", "published", "draft"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? "casino-gold-gradient text-black"
                  : "bg-white/[0.04] text-white/40 hover:text-white/70"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Edit/Create Form */}
      {showForm && (
        <div className="rounded-xl border border-white/[0.08] p-5 space-y-4" style={{ background: "#ffffff" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              {editing ? "Edit Post" : "New Post"}
            </h3>
            <button onClick={closeForm} className="text-white/30 hover:text-white/60">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Title</label>
              <Input
                value={form.title}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value, slug: form.slug || generateSlug(e.target.value) });
                }}
                placeholder="Blog post title"
                className="bg-white/[0.04] border-white/[0.08] text-white text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Slug</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="auto-generated-slug"
                className="bg-white/[0.04] border-white/[0.08] text-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#ffffff]">
                    {c.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] text-white text-sm px-3 py-2"
              >
                <option value="draft" className="bg-[#ffffff]">Draft</option>
                <option value="published" className="bg-[#ffffff]">Published</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Cover Image URL</label>
            <Input
              value={form.cover_image_url}
              onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="bg-white/[0.04] border-white/[0.08] text-white text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Excerpt</label>
            <Input
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="Short description..."
              className="bg-white/[0.04] border-white/[0.08] text-white text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Content</label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write your blog post content here..."
              rows={12}
              className="bg-white/[0.04] border-white/[0.08] text-white text-sm"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" size="sm" onClick={closeForm} className="text-xs border-white/[0.1] text-white/50">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="casino-gold-gradient text-black font-semibold text-xs">
              {editing ? "Update Post" : "Create Post"}
            </Button>
          </div>
        </div>
      )}

      {/* Posts List */}
      {!showForm && (
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-10 text-white/20 text-sm">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-10 text-white/20 text-sm">No posts found</div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] hover:border-white/[0.1] transition-colors"
                style={{ background: "#ffffff" }}
              >
                {/* Thumbnail */}
                <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.04]">
                  {post.cover_image_url ? (
                    <img src={post.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10 text-xl">📝</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white truncate">{post.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-white/30 uppercase">{post.category.replace(/-/g, " ")}</span>
                    <span className="text-white/10">•</span>
                    <span className={`text-[10px] font-medium ${post.status === "published" ? "text-emerald-400" : "text-amber-400"}`}>
                      {post.status}
                    </span>
                    <span className="text-white/10">•</span>
                    <span className="text-[10px] text-white/20">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleStatus(post)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
                    title={post.status === "published" ? "Unpublish" : "Publish"}
                  >
                    {post.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => openEdit(post)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/[0.04] transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
