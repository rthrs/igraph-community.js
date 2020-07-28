/* -*- mode: C -*-  */

#include <igraph.h>
#include <emscripten.h>
#include "config.h"
#include "debug.h"

enum algorithm_name{
    EDGE_BETWEENNESS,
    FAST_GREEDY,
    INFOMAP,
    LABEL_PROPAGATION,
    LEADING_EIGENVECTOR,
    LOUVAIN,
    OPTIMAL,
    SPINGLASS,
    WALKTRAP,

    // MODIFICATIONS

    FAST_GREEDY_SEED,
    LOUVAIN_SEED,
    EDGE_BETWEENNESS_SEED
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
                  igraph_vector_t *membership, igraph_vector_t *seed_membership,
                  FILE* f) {
    long int i = 0;
    igraph_vector_t our_membership;

    igraph_vector_init(&our_membership, 0);

    if (seed_membership != 0) {
        printf("Seed membership: [");
        for (i = 0; i < igraph_vector_size(seed_membership); i++) {
            printf("%li", (long int)VECTOR(*seed_membership)[i]);
            if (i != igraph_vector_size(seed_membership) - 1) {
                printf(", ");
            }
        }
        printf("]\n");
    }


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

    printf("Membership: [");
    for (i = 0; i < igraph_vector_size(&our_membership); i++) {
        printf("%li", (long int)VECTOR(our_membership)[i]);
        if (i != igraph_vector_size(&our_membership) - 1) {
            printf(", ");
        }
    }
    printf("]\n");

    igraph_vector_destroy(&our_membership);
}

igraph_real_t* membership_result;
igraph_real_t* modularity_result;
size_t modularity_size;

int progress_handler(const char *message, igraph_real_t percent, void *data) {
    while(*message!='\0') {
        printf("%c", *message++);
    }
    printf("%.2f%%\n", percent);
    return IGRAPH_SUCCESS;
}

// ASSUMPTION: all graphs unweighted so far and undirected
int runCommunityDetection(
    enum algorithm_name algorithm,
    igraph_integer_t n, const igraph_real_t *edges, size_t edges_len,
    const igraph_real_t *seed_membership
) {
    // TODO set external progress handler from JS
//     igraph_set_progress_handler(progress_handler);

    // Init graph from edges
    igraph_t g;
    igraph_vector_t edges_v;
    igraph_vector_view(&edges_v, edges, edges_len);

    igraph_create(&g, &edges_v, n, IGRAPH_UNDIRECTED);

    // Init seed membership vector
    igraph_vector_t seed_membership_v;

    if (seed_membership != 0) {
        igraph_vector_view(&seed_membership_v, seed_membership, n);
    }

    // Init result structures
    igraph_vector_t modularity, membership;
    igraph_vector_init(&modularity, 0);
    igraph_vector_init(&membership, 0);

    // Merges required when passing membership to walktrap algorithm
    igraph_matrix_t merges;
    igraph_matrix_init(&merges, 0, 0);

    // Algorithm specific variables
    int infomap_nb_trials = 5;
    igraph_real_t codelength;
    igraph_real_t max_modularity = -2; // -2 due to modularity is in range of [-1, 1]

    // Run algorithm
    switch(algorithm) {
        case EDGE_BETWEENNESS:
            igraph_community_edge_betweenness(&g, 0, 0, 0, 0, &modularity, &membership, IGRAPH_UNDIRECTED, 0);
            break;
        case FAST_GREEDY:
            igraph_community_fastgreedy(&g, 0, 0, &modularity, &membership);
            break;
        case INFOMAP:
            igraph_community_infomap(&g, 0, 0, infomap_nb_trials, &membership, &codelength);
            igraph_modularity(&g, &membership, &max_modularity, 0);
            break;
        case LABEL_PROPAGATION:
            igraph_community_label_propagation(&g, &membership, 0, /*initial*/ 0, /*fixed*/ 0, &max_modularity);
            break;
        case LEADING_EIGENVECTOR:
            // Consider steps as parameter; when steps == -1 then automatically should be set to number of vertices
            igraph_community_leading_eigenvector(&g, /*weights*/ 0, /*merges*/ 0, &membership, /*steps*/ -1,
                                                 /*options*/ 0, &max_modularity, /*start*/ 0, /*eigenvalues*/ 0,
                                                 /*eigenvectors*/ 0, /*history*/ 0, /*callback*/ 0,
                                                 /*callback_extra*/ 0);
            break;
        case LOUVAIN:
            igraph_community_multilevel(&g, 0, &membership, 0, &modularity);
            break;
        case OPTIMAL:
            igraph_community_optimal_modularity(&g, &max_modularity, &membership, /*weights*/ 0);
            break;
        case SPINGLASS:
            // Consider spins, starttemp, stoptemp, coolfact, update_rule, gamma as parameters
            igraph_community_spinglass(&g, /*weights*/ 0, &max_modularity, /*temperature*/ 0, &membership,
                                       /*csize*/ 0, /*spins*/ 25, /*parallel update*/ 0, /*start temperature*/ 1.0,
                                       /*stop temperature*/ 0.01, /*cooling factor*/ 0.99,
                                       IGRAPH_SPINCOMM_UPDATE_CONFIG, /*gamma*/ 1.0,
                                       IGRAPH_SPINCOMM_IMP_ORIG, /*gamma-=*/ 0);
            break;
        case WALKTRAP:
            // Consider steps as parameter
            igraph_community_walktrap(&g, /*wights*/ 0, /*steps*/ 4, &merges, &modularity, &membership);
            break;


        // MODIFICATIONS

        case FAST_GREEDY_SEED:
            igraph_community_fastgreedy_seed(&g, 0, 0, &modularity, &membership, &seed_membership_v);
            break;

        case LOUVAIN_SEED:
            igraph_community_multilevel_seed(&g, 0, &membership, 0, &modularity, &seed_membership_v);
            break;

        case EDGE_BETWEENNESS_SEED:
            igraph_community_edge_betweenness_seed(&g, 0, 0, 0, 0, &modularity, &membership,
                                                   IGRAPH_UNDIRECTED, 0, &seed_membership_v);
            break;
        default:
            return 1;
    }

    if (max_modularity != -2) {
        igraph_vector_push_back(&modularity, max_modularity);
    }


    IGRAPH_DEBUG(show_results(&g, &modularity, 0, &membership, seed_membership != 0 ? &seed_membership_v : 0, stdout));

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
    return runCommunityDetection(EDGE_BETWEENNESS, n, edges, edges_len, 0);
}

EMSCRIPTEN_KEEPALIVE
int fastGreedy(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len) {
    return runCommunityDetection(FAST_GREEDY, n, edges, edges_len, 0);
}

EMSCRIPTEN_KEEPALIVE
int infomap(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len) {
    return runCommunityDetection(INFOMAP, n, edges, edges_len, 0);
}

EMSCRIPTEN_KEEPALIVE
int labelPropagation(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len) {
    return runCommunityDetection(LABEL_PROPAGATION, n, edges, edges_len, 0);
}

EMSCRIPTEN_KEEPALIVE
int leadingEigenvector(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len) {
    return runCommunityDetection(LEADING_EIGENVECTOR, n, edges, edges_len, 0);
}

EMSCRIPTEN_KEEPALIVE
int louvain(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len) {
    return runCommunityDetection(LOUVAIN, n, edges, edges_len, 0);
}

EMSCRIPTEN_KEEPALIVE
int optimal(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len) {
    return runCommunityDetection(OPTIMAL, n, edges, edges_len, 0);
}

EMSCRIPTEN_KEEPALIVE
int spinglass(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len) {
    return runCommunityDetection(SPINGLASS, n, edges, edges_len, 0);
}

EMSCRIPTEN_KEEPALIVE
int walktrap(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len) {
    return runCommunityDetection(WALKTRAP, n, edges, edges_len, 0);
}

// MODIFICATIONS

EMSCRIPTEN_KEEPALIVE
int fastGreedySeed(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len,
                   const igraph_real_t *seed_membership) {
    return runCommunityDetection(FAST_GREEDY_SEED, n, edges, edges_len, seed_membership);
}

EMSCRIPTEN_KEEPALIVE
int louvainSeed(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len,
                const igraph_real_t *seed_membership) {
    return runCommunityDetection(LOUVAIN_SEED, n, edges, edges_len, seed_membership);
}

EMSCRIPTEN_KEEPALIVE
int edgeBetweennessSeed(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len,
                        const igraph_real_t *seed_membership) {
    return runCommunityDetection(EDGE_BETWEENNESS_SEED, n, edges, edges_len, seed_membership);
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
