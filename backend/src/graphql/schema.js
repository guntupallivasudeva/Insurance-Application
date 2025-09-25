import gql from 'graphql-tag';
import { userTypeDefs } from './userTypeDefs.js';
import { userResolver } from '../resolvers/UserResolver.js';



const baseTypeDefs = gql`
    type Query {
        _empty: String
    }

    type Mutation {
        _empty: String
    }
`;

export const typeDefs = [baseTypeDefs,userTypeDefs];
export const resolvers = [userResolver]; // Add other resolvers as needed