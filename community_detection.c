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
    LEIDEN,
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

igraph_real_t* modularities_found_result;
size_t modularities_found_size;

igraph_real_t membership_modularity_result;

int progress_handler(const char *message, igraph_real_t percent, void* data) {
    IGRAPH_UNUSED(data);

    EM_ASM({
        if (console && console.__IGRAPH_COMMUNITY__PROGRESS_HANDLER) {
            console.__IGRAPH_COMMUNITY__PROGRESS_HANDLER($0);
        }
    }, percent);

    return IGRAPH_SUCCESS;
}

// ASSUMPTION: all graphs unweighted so far and undirected
int runCommunityDetection(
    enum algorithm_name algorithm,
    igraph_integer_t n, const igraph_real_t *edges, size_t edges_len,
    const igraph_real_t *seed_membership
) {
    igraph_set_progress_handler(progress_handler);

    // Init graph from edges
    igraph_t g;
    igraph_vector_t edges_v, degree;
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

    // Init max modularity
    igraph_real_t max_modularity = -2; // -2 due to modularity is in range of [-1, 1]

    // Algorithm specific variables
    igraph_real_t codelength; // for infomap

    igraph_integer_t nb_clusters; // for leiden

    igraph_arpack_options_t options; // for leading_eigenvector

    igraph_matrix_t merges; // for walktrap

    // Run algorithm
    switch(algorithm) {
        case EDGE_BETWEENNESS:
            igraph_community_edge_betweenness(&g, 0, 0, 0, 0, &modularity, &membership, IGRAPH_UNDIRECTED, 0);
            break;
        case FAST_GREEDY:
            igraph_community_fastgreedy(&g, 0, 0, &modularity, &membership);
            break;
        case INFOMAP:
            // Consider nb_trials as parameter
            igraph_community_infomap(&g, 0, 0, /*nb_trials*/ 5, &membership, &codelength);
            igraph_modularity(&g, &membership, &max_modularity, 0);
            break;
        case LABEL_PROPAGATION:
            igraph_community_label_propagation(&g, &membership, 0, /*initial*/ 0, /*fixed*/ 0, &max_modularity);
            break;
        case LEADING_EIGENVECTOR:
            igraph_arpack_options_init(&options);

            // Consider steps as parameter; when steps == -1 then automatically should be set to number of vertices
            igraph_community_leading_eigenvector(&g, /*weights*/ 0, /*merges*/ 0, &membership, /*steps*/ -1,
                                                 /*options*/ &options, &max_modularity, /*start*/ 0, /*eigenvalues*/ 0,
                                                 /*eigenvectors*/ 0, /*history*/ 0, /*callback*/ 0,
                                                 /*callback_extra*/ 0);
            break;
        case LOUVAIN:
            igraph_community_multilevel(&g, 0, &membership, 0, &modularity);
            break;
        case LEIDEN:
            igraph_vector_init(&degree, igraph_vcount(&g));
            igraph_degree(&g, &degree, igraph_vss_all(), IGRAPH_ALL, 1);

            // Consider parameters to add, this one is modularity based approach
            igraph_community_leiden(&g, NULL, &degree, 1.0 / (2 * igraph_ecount(&g)), 0.01, 0,
                                    &membership, &nb_clusters, &max_modularity);

            igraph_vector_destroy(&degree);
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
            igraph_matrix_init(&merges, 0, 0);

            // Consider steps as parameter
            igraph_community_walktrap(&g, /*wights*/ 0, /*steps*/ 4, &merges, &modularity, &membership);

            igraph_matrix_destroy(&merges);
            break;


        // MODIFICATIONS

        case FAST_GREEDY_SEED:
            igraph_community_fastgreedy_seed(&g, 0, 0, &modularity, &membership, &seed_membership_v);
            break;

        case LOUVAIN_SEED:
            igraph_community_multilevel_seed(&g, 0, &membership, 0, &modularity,
                                             &seed_membership_v, /*meta nodes first*/ 1);
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
    } else {
        max_modularity = VECTOR(modularity)[igraph_vector_which_max(&modularity)];
    }

    membership_modularity_result = max_modularity;

    IGRAPH_DEBUG(show_results(&g, &modularity, 0, &membership, seed_membership != 0 ? &seed_membership_v : 0, stdout));

    // Copy result to C arrays
    membership_result = createBuffer(igraph_vector_size(&membership));
    modularities_found_size = igraph_vector_size(&modularity);
    modularities_found_result = createBuffer(modularities_found_size);

    igraph_vector_copy_to(&membership, membership_result);
    igraph_vector_copy_to(&modularity, modularities_found_result);

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
int leiden(igraph_integer_t n, const igraph_real_t *edges, size_t edges_len) {
    return runCommunityDetection(LEIDEN, n, edges, edges_len, 0);
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
double* getModularitiesFoundPointer() {
    return modularities_found_result;
}

EMSCRIPTEN_KEEPALIVE
size_t getModularitiesFoundSize() {
    return modularities_found_size;
}

EMSCRIPTEN_KEEPALIVE
igraph_real_t getMembershipModularity() {
    return membership_modularity_result;
}

EMSCRIPTEN_KEEPALIVE
void freeResult() {
    destroyBuffer(membership_result);
    destroyBuffer(modularities_found_result);
}
