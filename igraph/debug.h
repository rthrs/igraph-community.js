#ifdef IGRAPHJS_DEBUG
    #define IGRAPH_DEBUG(stmt) if (1) { stmt; }
#else
    #define IGRAPH_DEBUG(stmt) if (0) { stmt; }
#endif
