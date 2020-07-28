/* -*- mode: C -*-  */

#include <igraph.h>

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

int main() {
    igraph_t g;
    int n = 3;
    igraph_vector_t modularity, membership, seed_membership;

    igraph_vector_init(&modularity, 0);
    igraph_vector_init(&membership, 0);
    igraph_vector_init(&seed_membership, n);

    igraph_vector_fill(&seed_membership, -1);

    igraph_small(&g, n, IGRAPH_UNDIRECTED,
                 0,  1, 1, 2,
                 -1);

    printf(">>>>>>>>>>>>>> SIMPLE 0--1--2: <<<<<<<<<<<<<<<<\n");
    printf("MOD ALGO RUN>>>>\n\n");
    igraph_community_fastgreedy_seed(&g, 0, 0, &modularity, &membership, &seed_membership);
    show_results(&g, &modularity, 0, &membership, stdout);

    printf("\n********************\n");
    printf("ORI ALGO RUN>>>>\n");
    printf("********************\n\n");

    igraph_community_fastgreedy(&g, 0, 0, &modularity, &membership);
    show_results(&g, &modularity, 0, &membership, stdout);

    igraph_destroy(&g);


    printf("\n\n\n>>>>>>>>>>>>>> ZKC (NO SEED) <<<<<<<<<<<<<<<<\n");
    n = 34;
    /* Zachary Karate club */
    igraph_small(&g, 0, IGRAPH_UNDIRECTED,
                 0,  1,  0,  2,  0,  3,  0,  4,  0,  5,
                 0,  6,  0,  7,  0,  8,  0, 10,  0, 11,
                 0, 12,  0, 13,  0, 17,  0, 19,  0, 21,
                 0, 31,  1,  2,  1,  3,  1,  7,  1, 13,
                 1, 17,  1, 19,  1, 21,  1, 30,  2,  3,
                 2,  7,  2,  8,  2,  9,  2, 13,  2, 27,
                 2, 28,  2, 32,  3,  7,  3, 12,  3, 13,
                 4,  6,  4, 10,  5,  6,  5, 10,  5, 16,
                 6, 16,  8, 30,  8, 32,  8, 33,  9, 33,
                 13, 33, 14, 32, 14, 33, 15, 32, 15, 33,
                 18, 32, 18, 33, 19, 33, 20, 32, 20, 33,
                 22, 32, 22, 33, 23, 25, 23, 27, 23, 29,
                 23, 32, 23, 33, 24, 25, 24, 27, 24, 31,
                 25, 31, 26, 29, 26, 33, 27, 33, 28, 31,
                 28, 33, 29, 32, 29, 33, 30, 32, 30, 33,
                 31, 32, 31, 33, 32, 33,
                 -1);

    igraph_vector_resize(&seed_membership, n);

    igraph_vector_fill(&seed_membership, -1);

    printf("MOD ALGO RUN>>>>\n\n");
    igraph_community_fastgreedy_seed(&g, 0, 0, &modularity, &membership, &seed_membership);
    show_results(&g, &modularity, 0, &membership, stdout);

    printf("\n********************\n");
    printf("ORI ALGO RUN>>>>\n");
    printf("********************\n\n");

    igraph_community_fastgreedy(&g, 0, 0, &modularity, &membership);
    show_results(&g, &modularity, 0, &membership, stdout);

    igraph_destroy(&g);



    printf("\n\n\n>>>>>>>>>>>>>> ZKC ([1, 5], [32, 34]) <<<<<<<<<<<<<<<<\n");
    n = 34;
    /* Zachary Karate club */
    igraph_small(&g, 0, IGRAPH_UNDIRECTED,
                 0,  1,  0,  2,  0,  3,  0,  4,  0,  5,
                 0,  6,  0,  7,  0,  8,  0, 10,  0, 11,
                 0, 12,  0, 13,  0, 17,  0, 19,  0, 21,
                 0, 31,  1,  2,  1,  3,  1,  7,  1, 13,
                 1, 17,  1, 19,  1, 21,  1, 30,  2,  3,
                 2,  7,  2,  8,  2,  9,  2, 13,  2, 27,
                 2, 28,  2, 32,  3,  7,  3, 12,  3, 13,
                 4,  6,  4, 10,  5,  6,  5, 10,  5, 16,
                 6, 16,  8, 30,  8, 32,  8, 33,  9, 33,
                 13, 33, 14, 32, 14, 33, 15, 32, 15, 33,
                 18, 32, 18, 33, 19, 33, 20, 32, 20, 33,
                 22, 32, 22, 33, 23, 25, 23, 27, 23, 29,
                 23, 32, 23, 33, 24, 25, 24, 27, 24, 31,
                 25, 31, 26, 29, 26, 33, 27, 33, 28, 31,
                 28, 33, 29, 32, 29, 33, 30, 32, 30, 33,
                 31, 32, 31, 33, 32, 33,
                 -1);

    igraph_vector_resize(&seed_membership, n);

    igraph_vector_fill(&seed_membership, -1);

    VECTOR(seed_membership)[33] = 0;
    VECTOR(seed_membership)[31] = 0;

    VECTOR(seed_membership)[0] = 1;
    VECTOR(seed_membership)[4] = 1;

    printf("MOD ALGO RUN>>>>\n\n");
    igraph_community_fastgreedy_seed(&g, 0, 0, &modularity, &membership, &seed_membership);
    show_results(&g, &modularity, 0, &membership, stdout);

    igraph_destroy(&g);




    printf("\n\n\n>>>>>>>>>>>>>> ZKC ([ 2, 8, 9, 14, 15, 18, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33 ]) <<<<<<<<<<<<<<<<\n");
    n = 34;
    /* Zachary Karate club */
    igraph_small(&g, 0, IGRAPH_UNDIRECTED,
                 0,  1,  0,  2,  0,  3,  0,  4,  0,  5,
                 0,  6,  0,  7,  0,  8,  0, 10,  0, 11,
                 0, 12,  0, 13,  0, 17,  0, 19,  0, 21,
                 0, 31,  1,  2,  1,  3,  1,  7,  1, 13,
                 1, 17,  1, 19,  1, 21,  1, 30,  2,  3,
                 2,  7,  2,  8,  2,  9,  2, 13,  2, 27,
                 2, 28,  2, 32,  3,  7,  3, 12,  3, 13,
                 4,  6,  4, 10,  5,  6,  5, 10,  5, 16,
                 6, 16,  8, 30,  8, 32,  8, 33,  9, 33,
                 13, 33, 14, 32, 14, 33, 15, 32, 15, 33,
                 18, 32, 18, 33, 19, 33, 20, 32, 20, 33,
                 22, 32, 22, 33, 23, 25, 23, 27, 23, 29,
                 23, 32, 23, 33, 24, 25, 24, 27, 24, 31,
                 25, 31, 26, 29, 26, 33, 27, 33, 28, 31,
                 28, 33, 29, 32, 29, 33, 30, 32, 30, 33,
                 31, 32, 31, 33, 32, 33,
                 -1);

    igraph_vector_resize(&seed_membership, n);

    igraph_vector_fill(&seed_membership, -1);

    VECTOR(seed_membership)[2] = 0;
    VECTOR(seed_membership)[8] = 0;
    VECTOR(seed_membership)[9] = 0;
    VECTOR(seed_membership)[14] = 0;
    VECTOR(seed_membership)[15] = 0;
    VECTOR(seed_membership)[18] = 0;
    VECTOR(seed_membership)[20] = 0;
    VECTOR(seed_membership)[22] = 0;
    VECTOR(seed_membership)[23] = 0;
    VECTOR(seed_membership)[24] = 0;
    VECTOR(seed_membership)[25] = 0;
    VECTOR(seed_membership)[26] = 0;
    VECTOR(seed_membership)[27] = 0;
    VECTOR(seed_membership)[28] = 0;
    VECTOR(seed_membership)[29] = 0;
    VECTOR(seed_membership)[30] = 0;
    VECTOR(seed_membership)[31] = 0;
    VECTOR(seed_membership)[32] = 0;
    VECTOR(seed_membership)[33] = 0;

    printf("MOD ALGO RUN>>>>\n\n");
    igraph_community_fastgreedy_seed(&g, 0, 0, &modularity, &membership, &seed_membership);
    show_results(&g, &modularity, 0, &membership, stdout);

    igraph_destroy(&g);




    // Clean up
    igraph_vector_destroy(&membership);
    igraph_vector_destroy(&modularity);
    igraph_vector_destroy(&seed_membership);

    return 0;
}
