/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface Window {
  electron: {
    getIsDev: () => Promise<boolean>,
    window: {
      minimize: () => void
      maximize: () => void
      close: () => void
    }
    db: {
      movies: {
        list: (params?: any) => Promise<any>
        get: (id: number) => Promise<any>
        create: (data: any) => Promise<any>
        update: (id: number, data: any) => Promise<any>
        delete: (id: number) => Promise<any>
        download: (url: string, id: number, type: string) => Promise<any>
        exists: (id: number, type: string) => Promise<any>
        actors: {
          getForMovie: (id: number) => Promise<any>
          upsert: (data: any) => Promise<any>
          link: (data: any) => Promise<any>
          get: (id: number) => Promise<any>
          movies: (id: number) => Promise<any>
        }
        sync: {
          dirty: () => Promise<any[]>
          markSynced: (p: any) => Promise<any>
          hardDelete: (id: number) => Promise<any>
        }
        clear: () => Promise<any>
      }
    }
    settings: {
      get: (key: string) => Promise<any>
      set: (key: string, value: any) => Promise<any>
      getAll: () => Promise<any>
    }
    onNavigate: (callback: (path: string) => void) => void
  }
}
