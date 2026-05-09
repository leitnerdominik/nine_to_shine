import React from 'react';
import { Box, Skeleton } from '@mui/material';

const LoadingSkeleton = () => {
    return (
        <Box>
            <Skeleton variant="text" height={40} />
            <Skeleton variant="text" height={40} />
            <Skeleton
                variant="rounded"
                height={100}
                style={{ marginTop: 8 }}
            />
        </Box>
    );
};

export default LoadingSkeleton;
