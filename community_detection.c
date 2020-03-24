/* -*- mode: C -*-  */

#include <igraph.h>
#include <emscripten.h>

enum algorithm_name{
    EDGE_BETWEENNESS,
    FAST_GREEDY,
    INFOMAP,
    LABEL_PROPAGATION,
    LOUVAIN,
};


EMSCRIPTEN_KEEPALIVE
igraph_real_t* createBuffer(int length) {
    return malloc(length * sizeof(igraph_real_t));
}

EMSCRIPTEN_KEEPALIVE
uint8_t* create_buffer(int width, int height) {
    return malloc(width * height * 4 * sizeof(uint8_t));
}

EMSCRIPTEN_KEEPALIVE
void destroyBuffer(igraph_real_t* p) {
    free(p);
}


void show_results(igraph_t *g, igraph_vector_t *mod, igraph_matrix_t *merges,
                  igraph_vector_t *membership, FILE* f) {
    long int i = 0;
    igraph_vector_t our_membership;

    igraph_vector_init(&our_membership, 0);

    if (mod != 0) {
        i = igraph_vector_which_max(mod);
        fprintf(f, "Modularity:  %f\n", VECTOR(*mod)[i]);
    } else {
        fprintf(f, "Modularity:  ---\n");
    }

    if (membership != 0) {
        igraph_vector_update(&our_membership, membership);
    } else if (merges != 0) {
        igraph_community_to_membership(merges, igraph_vcount(g), i, &our_membership, 0);
    }

    printf("Membership: ");
    for (i = 0; i < igraph_vector_size(&our_membership); i++) {
        printf("%li ", (long int)VECTOR(our_membership)[i]);
    }
    printf("\n");

    igraph_vector_destroy(&our_membership);
}

igraph_real_t* membership_result;
igraph_real_t* modularity_result;
size_t modularity_size;

// ASSUMPTION: all graphs unweighted so far and undirected
int runCommunityDetection(
    enum algorithm_name algorithm,
    igraph_integer_t n, const igraph_real_t *edges, size_t edges_len
) {
    // Init graph from edges
    igraph_t g;
    igraph_vector_t edges_v;
    igraph_vector_view(&edges_v, edges, edges_len);

    igraph_create(&g, &edges_v, n, IGRAPH_UNDIRECTED);

    // Init result structures
    igraph_vector_t modularity, membership;
    igraph_vector_init(&modularity, 0);
    igraph_vector_init(&membership, 0);

    // Algorithm specific variables
    int infomap_nb_trials = 5;
    igraph_real_t codelength;
    igraph_real_t max_modularity = -2;

    // Run algorithm
    switch(algorithm) {
        case EDGE_BETWEENNESS:
            igraph_community_edge_betweenness(&g, 0, 0, 0, 0, &modularity, &membership, IGRAPH_UNDIRECTED, 0);
            break;
        case FAST_GREEDY:
            igraph_community_fastgreedy(&g, 0, 0, &modularity, &membership);
            break;
        case INFOMAP:
            // TODO add nb_trials parameter; return modularity and codelength
            // FIXME doesn't work
            igraph_community_infomap(&g, 0, 0, infomap_nb_trials, &membership, &codelength);
            igraph_modularity(&g, &membership, &max_modularity, 0);
            break;
        case LABEL_PROPAGATION:
            igraph_community_label_propagation(&g, &membership, 0, /*initial*/ 0, /*fixed*/ 0, &max_modularity);
            break;
        case LOUVAIN:
            igraph_community_multilevel(&g, 0, &membership, 0, &modularity);
            break;
        default:
            return 1;
    }

    if (max_modularity != -2) {
        igraph_vector_push_back(&modularity, max_modularity);
    }

    // TODO wrap into debug mode
    show_results(&g, &modularity, 0, &membership, stdout);

    // Copy result to C arrays
    membership_result = createBuffer(igraph_vector_size(&membership));
    modularity_size = igraph_vector_size(&modularity);
    modularity_result = createBuffer(modularity_size);

    igraph_vector_copy_to(&membership, membership_result);
    igraph_vector_copy_to(&modularity, modularity_result);

    // Destroy result structures
    igraph_vector_destroy(&membership);
    igraph_vector_destroy(&modularity);

    // Destroy graph
    igraph_destroy(&g);

    return 0;
}


// Community detection runners

EMSCRIPTEN_KEEPALIVE
int edgeBetweenness(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len) {
    return runCommunityDetection(EDGE_BETWEENNESS, n, edges, edges_len);
}

EMSCRIPTEN_KEEPALIVE
int fastGreedy(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len) {
    return runCommunityDetection(FAST_GREEDY, n, edges, edges_len);
}

EMSCRIPTEN_KEEPALIVE
int infomap(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len) {
    return runCommunityDetection(INFOMAP, n, edges, edges_len);
}

EMSCRIPTEN_KEEPALIVE
int labelPropagation(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len) {
    return runCommunityDetection(LABEL_PROPAGATION, n, edges, edges_len);
}

EMSCRIPTEN_KEEPALIVE
int louvain(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len) {
    return runCommunityDetection(LOUVAIN, n, edges, edges_len);
}


// Helpers

EMSCRIPTEN_KEEPALIVE
igraph_real_t* getMembershipPointer() {
    return membership_result;
}

EMSCRIPTEN_KEEPALIVE
double* getModularityPointer() {
    return modularity_result;
}

EMSCRIPTEN_KEEPALIVE
size_t getModularitySize() {
    return modularity_size;
}

EMSCRIPTEN_KEEPALIVE
void freeResult() {
    destroyBuffer(membership_result);
    destroyBuffer(modularity_result);
}
