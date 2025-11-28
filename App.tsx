import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ApiService } from './services/apiService';
import { FileItem, FileCategory } from './types';
import { getCategoryFromMime, getIconForCategory } from './utils/fileUtils';
import { NavBar } from './components/NavBar';
import { MediaPreview } from './components/MediaPreview';
import { 
  Upload, 
  Search, 
  Link as LinkIcon, 
  LayoutGrid, 
  List as ListIcon,
  PlayCircle,
  RefreshCw,
  AlertCircle,
  Download,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Settings,
  Save,
  X
} from 'lucide-react';

// --- Sub-components moved outside ---

interface SectionHeaderProps {
  title: string;
  icon: any;
  category: FileCategory;
  count: number;
  setActiveCategory: (cat: FileCategory) => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon: Icon, category, count, setActiveCategory }) => (
  <div className="flex items-center justify-between mb-4 mt-8 first:mt-0">
    <div className="flex items-center gap-2">
      <div className="p-2 bg-white/5 rounded-lg">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-zinc-400">{count}</span>
    </div>
    <button 
      onClick={() => setActiveCategory(category)}
      className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
    >
      View All <ChevronRight className="w-3 h-3" />
    </button>
  </div>
);

interface FileCardProps {
  item: FileItem;
  viewMode: 'grid' | 'list';
  activeCategory: FileCategory;
  onSelect: (item: FileItem) => void;
}

const FileCard: React.FC<FileCardProps> = ({ item, viewMode, activeCategory, onSelect }) => {
  const category = getCategoryFromMime(item.filetype);
  const CategoryIcon = getIconForCategory(category);
  
  // List view logic: Show list row if in list mode AND looking at a specific category (not dashboard)
  if (viewMode === 'list' && activeCategory !== FileCategory.ALL) {
    return (
       <div 
        onClick={() => onSelect(item)}
        className="group flex items-center gap-4 p-4 bg-surface hover:bg-white/5 border border-white/5 rounded-xl cursor-pointer transition-colors"
       >
         <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
           <CategoryIcon className="w-5 h-5 text-zinc-400 group-hover:text-white" />
         </div>
         <div className="flex-1 min-w-0">
           <h4 className="text-sm font-medium text-white truncate group-hover:text-primary transition-colors">{item.text || item.id}</h4>
           <p className="text-xs text-zinc-500 truncate">{item.filetype || 'Unknown Type'}</p>
         </div>
         <button className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full">
           <PlayCircle className="w-5 h-5" />
         </button>
       </div>
    );
  }

  // Grid view logic (Default)
  return (
    <div 
      onClick={() => onSelect(item)}
      className="group relative aspect-square bg-surface border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-black/50"
    >
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
         {category === FileCategory.IMAGE ? (
           <img 
            src={ApiService.getDownloadUrl(item.id)} 
            alt={item.text}
            loading="lazy"
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
           />
         ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-500 group-hover:text-white transition-colors">
               <CategoryIcon className="w-10 h-10" />
            </div>
         )}
         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
            <span className="p-3 bg-white/10 rounded-full text-white">
               {category === FileCategory.DOCUMENT ? <Download className="w-5 h-5"/> : <PlayCircle className="w-6 h-6" />}
            </span>
         </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
        <p className="text-xs font-medium text-white truncate">{item.text || 'Untitled'}</p>
        <p className="text-[10px] text-zinc-400 truncate mt-0.5 uppercase tracking-wider">{item.filetype || category}</p>
      </div>
    </div>
  );
};

// --- Main App Component ---

function App() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation State
  const [activeCategory, setActiveCategory] = useState<FileCategory>(FileCategory.ALL); // ALL = Dashboard View
  const [searchQuery, setSearchQuery] = useState('');
  
  // Media Player State
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadText, setUploadText] = useState('');
  
  // External Link State
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [externalLink, setExternalLink] = useState('');
  const [playingExternalUrl, setPlayingExternalUrl] = useState<string | null>(null);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState(ApiService.getBaseUrl());

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 1. 获取后端响应
      const response: any = await ApiService.getList();
      
      console.log("后端返回的数据:", response); // 方便在控制台调试

      // 2. 【关键修改】提取内部的 data 字段
      // 如果 response 本身是数组(兼容旧代码)，用 response
      // 如果 response.data 是数组(你的现状)，用 response.data
      let actualData = [];
      
      if (Array.isArray(response)) {
          actualData = response;
      } else if (response && Array.isArray(response.data)) {
          actualData = response.data;
      }

      // 3. 设置数据
      setItems(actualData.reverse()); 
      
    } catch (error) {
      console.error(error);
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSaveSettings = () => {
    ApiService.setBaseUrl(serverUrl);
    setShowSettings(false);
    fetchItems();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    const file = e.target.files[0];
    
    try {
      const description = uploadText.trim() || file.name;
      await ApiService.uploadFile(file, description);
      setUploadText('');
      await fetchItems();
    } catch (error) {
      alert("Upload failed. Please check the server connection.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePlayExternal = () => {
    if (!externalLink) return;
    setPlayingExternalUrl(externalLink);
    setShowLinkInput(false);
  };

  // Group items for the dashboard (Memoized for performance)
  const groupedItems = useMemo(() => {
    const documents = [];
    const images = [];
    const videos = [];
    const audio = [];

    for (const item of items) {
      const cat = getCategoryFromMime(item.filetype);
      if (cat === FileCategory.DOCUMENT) documents.push(item);
      else if (cat === FileCategory.IMAGE) images.push(item);
      else if (cat === FileCategory.VIDEO) videos.push(item);
      else if (cat === FileCategory.AUDIO) audio.push(item);
    }

    return { documents, images, videos, audio };
  }, [items]);

  // Determine what to display based on active category
  const displayItems = useMemo(() => {
    let targetList: FileItem[] = [];
    if (activeCategory === FileCategory.ALL) return []; // Dashboard handles itself
    
    if (activeCategory === FileCategory.DOCUMENT) targetList = groupedItems.documents;
    if (activeCategory === FileCategory.IMAGE) targetList = groupedItems.images;
    if (activeCategory === FileCategory.VIDEO) targetList = groupedItems.videos;
    if (activeCategory === FileCategory.AUDIO) targetList = groupedItems.audio;

    if (searchQuery) {
      return targetList.filter(item => (item.text || '').toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return targetList;
  }, [activeCategory, groupedItems, searchQuery]);

  const navCategories = [
    { id: FileCategory.ALL, label: 'Dashboard' },
    { id: FileCategory.DOCUMENT, label: 'Documents' },
    { id: FileCategory.IMAGE, label: 'Images' },
    { id: FileCategory.VIDEO, label: 'Videos' },
    { id: FileCategory.AUDIO, label: 'Music' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Enhanced Navbar with Refresh */}
      <NavBar isOnline={!error} onOpenSettings={() => setShowSettings(true)} />

      {/* Manual Refresh Button (Portal-like placement) */}
      <div className="fixed top-3 right-16 z-[60] md:right-20">
        <button 
            onClick={fetchItems}
            className={`p-2 rounded-full text-zinc-400 hover:text-white transition-all hover:rotate-180 ${loading ? 'animate-spin text-primary' : ''}`}
            title="Refresh Content"
        >
            <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <main className="pt-24 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
        
        {/* Top Action Section: Upload & Link */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-primary/20 transition-colors"></div>
            <h2 className="text-xl font-semibold mb-4 text-white">Upload Content</h2>
            <div className="flex flex-col md:flex-row gap-4 relative z-10">
              <input 
                type="text" 
                placeholder="Description (optional)..." 
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary/50 text-white flex-1 transition-all focus:bg-black/60"
              />
              <div className="relative">
                 <input 
                   type="file" 
                   id="file-upload" 
                   className="hidden" 
                   onChange={handleUpload} 
                   disabled={isUploading}
                 />
                 <label 
                   htmlFor="file-upload"
                   className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium cursor-pointer transition-all whitespace-nowrap ${isUploading ? 'bg-zinc-700 cursor-wait' : 'bg-primary hover:bg-primaryHover text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'}`}
                 >
                   {isUploading ? (
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   ) : (
                     <Upload className="w-5 h-5" />
                   )}
                   <span>{isUploading ? 'Uploading...' : 'Select File'}</span>
                 </label>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-white/5 rounded-2xl p-6 relative">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-white">Stream URL</h2>
              <button onClick={() => setShowLinkInput(!showLinkInput)} className="text-primary hover:text-white transition-colors">
                <LinkIcon className="w-5 h-5" />
              </button>
            </div>
            
            {showLinkInput ? (
               <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                 <input 
                   type="text" 
                   placeholder="https://site.com/video.mp4" 
                   className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                   value={externalLink}
                   onChange={(e) => setExternalLink(e.target.value)}
                 />
                 <button 
                  onClick={handlePlayExternal}
                  className="w-full py-2 bg-secondary/80 hover:bg-secondary text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                 >
                   <PlayCircle className="w-4 h-4" />
                   Play
                 </button>
               </div>
            ) : (
              <div className="h-20 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-500 hover:text-zinc-400 transition-colors" onClick={() => setShowLinkInput(true)}>
                 <LinkIcon className="w-6 h-6 mb-1 opacity-50" />
                 <span className="text-xs">Paste Link</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation & Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-20 z-40 py-4 bg-background/95 backdrop-blur border-b border-transparent">
          <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-white/5 overflow-x-auto max-w-full no-scrollbar shadow-lg shadow-black/20">
            {navCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeCategory === cat.id ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {activeCategory !== FileCategory.ALL && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
               <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-surface border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-white/20 w-40 md:w-64 transition-all focus:w-full md:focus:w-72"
                  />
               </div>
               <div className="flex bg-surface rounded-lg p-1 border border-white/5">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-zinc-500'}`}><LayoutGrid className="w-4 h-4" /></button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-zinc-500'}`}><ListIcon className="w-4 h-4" /></button>
               </div>
            </div>
          )}
        </div>

        {/* Main Content Render */}
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-zinc-500 text-sm animate-pulse">Syncing with Cloud...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-surface/50 rounded-2xl border border-white/5">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Connection Failed</h3>
            <p className="text-zinc-400 text-sm max-w-md mb-6">{error}</p>
            <p className="text-xs text-zinc-500 mb-6">Current URL: {ApiService.getBaseUrl()}</p>
            <div className="flex gap-4">
              <button 
                onClick={fetchItems}
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
              >
                Retry
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="px-6 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg font-medium transition-colors"
              >
                Configure Server
              </button>
            </div>
          </div>
        ) : activeCategory === FileCategory.ALL ? (
          // DASHBOARD VIEW (Limited Items)
          <div className="space-y-8 animate-in fade-in duration-500">
             {groupedItems.documents.length > 0 && (
                <section>
                  <SectionHeader title="Recent Documents" icon={FileText} category={FileCategory.DOCUMENT} count={groupedItems.documents.length} setActiveCategory={setActiveCategory} />
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {groupedItems.documents.slice(0, 5).map(item => (
                      <FileCard 
                        key={item.id} 
                        item={item} 
                        viewMode={viewMode}
                        activeCategory={activeCategory}
                        onSelect={setSelectedItem}
                      />
                    ))}
                  </div>
                </section>
             )}

             {groupedItems.images.length > 0 && (
                <section>
                  <SectionHeader title="Recent Images" icon={ImageIcon} category={FileCategory.IMAGE} count={groupedItems.images.length} setActiveCategory={setActiveCategory} />
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {groupedItems.images.slice(0, 5).map(item => (
                      <FileCard 
                        key={item.id} 
                        item={item} 
                        viewMode={viewMode}
                        activeCategory={activeCategory}
                        onSelect={setSelectedItem}
                      />
                    ))}
                  </div>
                </section>
             )}

             {groupedItems.videos.length > 0 && (
                <section>
                  <SectionHeader title="Recent Videos" icon={Video} category={FileCategory.VIDEO} count={groupedItems.videos.length} setActiveCategory={setActiveCategory} />
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {groupedItems.videos.slice(0, 5).map(item => (
                      <FileCard 
                        key={item.id} 
                        item={item} 
                        viewMode={viewMode}
                        activeCategory={activeCategory}
                        onSelect={setSelectedItem}
                      />
                    ))}
                  </div>
                </section>
             )}

            {groupedItems.audio.length > 0 && (
                <section>
                  <SectionHeader title="Recent Audio" icon={Music} category={FileCategory.AUDIO} count={groupedItems.audio.length} setActiveCategory={setActiveCategory} />
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {groupedItems.audio.slice(0, 5).map(item => (
                      <FileCard 
                        key={item.id} 
                        item={item} 
                        viewMode={viewMode}
                        activeCategory={activeCategory}
                        onSelect={setSelectedItem}
                      />
                    ))}
                  </div>
                </section>
             )}

             {items.length === 0 && (
               <div className="text-center py-20 text-zinc-500">No files uploaded yet.</div>
             )}
          </div>
        ) : (
          // CATEGORY VIEW (All items in category)
          <div className={`animate-in fade-in duration-300 ${viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" : "flex flex-col gap-2"}`}>
            {displayItems.length > 0 ? displayItems.map(item => (
              <FileCard 
                key={item.id} 
                item={item} 
                viewMode={viewMode}
                activeCategory={activeCategory}
                onSelect={setSelectedItem}
              />
            )) : (
              <div className="col-span-full py-20 text-center text-zinc-500">
                 <p>No files found in this category.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-surface w-full max-w-md p-6 rounded-2xl border border-white/10 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Server Settings</h3>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-zinc-400 mb-2">Backend API URL</label>
                   <input 
                      type="text" 
                      value={serverUrl} 
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="https://your-tunnel-url.com"
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                   />
                   <p className="text-xs text-zinc-500 mt-2">
                     If you are using cpolar/ngrok, paste the new forwarding URL here when it changes.
                   </p>
                 </div>
                 
                 <div className="pt-4 flex justify-end gap-3">
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="px-4 py-2 text-zinc-400 hover:text-white font-medium"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveSettings}
                      className="px-6 py-2 bg-primary hover:bg-primaryHover text-white rounded-lg font-medium flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save Configuration
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Media Preview Modal */}
      {(selectedItem || playingExternalUrl) && (
        <MediaPreview 
          item={selectedItem} 
          externalUrl={playingExternalUrl}
          onClose={() => {
            setSelectedItem(null);
            setPlayingExternalUrl(null);
          }} 
        />
      )}
    </div>
  );
}

export default App;