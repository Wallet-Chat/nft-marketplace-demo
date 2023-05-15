import AnalyticsProvider, {
  initializeAnalytics,
} from 'components/AnalyticsProvider'
initializeAnalytics()

import { Inter } from '@next/font/google'
import type { AppContext, AppProps } from 'next/app'
import { default as NextApp } from 'next/app'
import { ThemeProvider, useTheme } from 'next-themes'
import { darkTheme, globalReset } from 'stitches.config'
import '@rainbow-me/rainbowkit/styles.css'
import {
  RainbowKitProvider,
  createAuthenticationAdapter,
  RainbowKitAuthenticationProvider,
  getDefaultWallets,
  darkTheme as rainbowDarkTheme,
  lightTheme as rainbowLightTheme,
  AuthenticationStatus,
} from '@rainbow-me/rainbowkit'
import {
  WagmiConfig,
  createClient,
  configureChains,
  useSignMessage,
  useAccount,
  useNetwork,
} from 'wagmi'
import * as Tooltip from '@radix-ui/react-tooltip'
import { publicProvider } from 'wagmi/providers/public'
import { alchemyProvider } from 'wagmi/providers/alchemy'

import {
  ReservoirKitProvider,
  darkTheme as reservoirDarkTheme,
  lightTheme as reservoirLightTheme,
  ReservoirKitTheme,
  CartProvider,
} from '@reservoir0x/reservoir-kit-ui'
import { FC, useEffect, useState } from 'react'
import { HotkeysProvider } from 'react-hotkeys-hook'
import ToastContextProvider from 'context/ToastContextProvider'
import supportedChains from 'utils/chains'
import { useMarketplaceChain } from 'hooks'
import ChainContextProvider from 'context/ChainContextProvider'
import { WalletChatProvider, WalletChatWidget } from 'react-wallet-chat'
import { RainbowKitSiweNextAuthProvider } from '@rainbow-me/rainbowkit-siwe-next-auth';
import { SiweMessage } from 'siwe';
import React from 'react'

//CONFIGURABLE: Use nextjs to load your own custom font: https://nextjs.org/docs/basic-features/font-optimization
const inter = Inter({
  subsets: ['latin'],
})

export const NORMALIZE_ROYALTIES = process.env.NEXT_PUBLIC_NORMALIZE_ROYALTIES
  ? process.env.NEXT_PUBLIC_NORMALIZE_ROYALTIES === 'true'
  : false

const { chains, provider } = configureChains(supportedChains, [
  alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_ID || '' }),
  publicProvider(),
])

const { connectors } = getDefaultWallets({
  appName: 'Reservoir Marketplace',
  chains,
})

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
})

//CONFIGURABLE: Here you can override any of the theme tokens provided by RK: https://docs.reservoir.tools/docs/reservoir-kit-theming-and-customization
const reservoirKitThemeOverrides = {
  headlineFont: inter.style.fontFamily,
  font: inter.style.fontFamily,
  primaryColor: '#6E56CB',
  primaryHoverColor: '#644fc1',
}

function AppWrapper(props: AppProps & { baseUrl: string }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      value={{
        dark: darkTheme.className,
        light: 'light',
      }}
    >
      <WagmiConfig client={wagmiClient}>
        <ChainContextProvider>
          <AnalyticsProvider>
            <MyApp {...props} />
          </AnalyticsProvider>
        </ChainContextProvider>
      </WagmiConfig>
    </ThemeProvider>
  )
}

function MyApp({
  Component,
  pageProps,
  baseUrl,
}: AppProps & { baseUrl: string }) {
  globalReset()

  const { theme } = useTheme()
  const marketplaceChain = useMarketplaceChain()
  const [reservoirKitTheme, setReservoirKitTheme] = useState<
    ReservoirKitTheme | undefined
  >()

  const [rainbowKitTheme, setRainbowKitTheme] = useState<
    | ReturnType<typeof rainbowDarkTheme>
    | ReturnType<typeof rainbowLightTheme>
    | undefined
  >()

  useEffect(() => {
    if (theme == 'dark') {
      setReservoirKitTheme(reservoirDarkTheme(reservoirKitThemeOverrides))
      setRainbowKitTheme(
        rainbowDarkTheme({
          borderRadius: 'small',
        })
      )
    } else {
      setReservoirKitTheme(reservoirLightTheme(reservoirKitThemeOverrides))
      setRainbowKitTheme(
        rainbowLightTheme({
          borderRadius: 'small',
        })
      )
    }
  }, [theme])

  const FunctionalComponent = Component as FC

  let source = process.env.NEXT_PUBLIC_MARKETPLACE_SOURCE

  if (!source && process.env.NEXT_PUBLIC_HOST_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_HOST_URL)
      source = url.host
    } catch (e) {}
  }

const { signMessageAsync } = useSignMessage()
const { address, connector: activeConnector } = useAccount()
const { chain } = useNetwork()
const [ authStatus, setAuthStatus ] = useState<AuthenticationStatus>('unauthenticated')
const chainId = chain?.id
const [signedMessage, setSignedMessage] = useState('')
const [messageSignature, setMesssageSignature] = useState('')

const authenticationAdapter = createAuthenticationAdapter({
  getNonce: async () => {
    let _nonce = ""
    const response = await fetch(`https://api.v2.walletchat.fun/users/${address}/nonce`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => response.json())
      .then(async (usersData: { Nonce: string }) => {
        console.log('✅[GET][Nonce]:', usersData)
        _nonce = usersData.Nonce
      })
      .catch((error) => {
        console.log('🚨[GET][Nonce]:', error)
      })
    return _nonce;
  },

  createMessage: ({ nonce, address, chainId }) => {
    setAuthStatus('loading')
    return new SiweMessage({
      domain: window.location.host,
      address,
      statement: 'Sign in with Ethereum to the app.',
      uri: window.location.origin,
      version: '1',
      chainId,
      nonce,
    });
  },

  getMessageBody: ({ message }) => {
    return message.prepareMessage();
  },

  verify: async ({ message, signature }) => {
    // const verifyRes = await fetch('/api/verify', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ message, signature }),
    // });

    //this should move into widget somewhere more packaged
    setSignedMessage(message.prepareMessage())
    setMesssageSignature(signature)

    setAuthStatus('authenticated')

    return true;
  },

  signOut: async () => {
    //await fetch('/api/logout');
    setAuthStatus('unauthenticated')
  },
});

  return (
    <HotkeysProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        value={{
          dark: darkTheme.className,
          light: 'light',
        }}
      >
        <ReservoirKitProvider
          options={{
            //CONFIGURABLE: Override any configuration available in RK: https://docs.reservoir.tools/docs/reservoirkit-ui#configuring-reservoirkit-ui
            // Note that you should at the very least configure the source with your own domain
            chains: supportedChains.map(({ proxyApi, id }) => {
              return {
                id,
                baseApiUrl: `${baseUrl}${proxyApi}`,
                default: marketplaceChain.id === id,
              }
            }),
            source: source,
            normalizeRoyalties: NORMALIZE_ROYALTIES,
            //CONFIGURABLE: Set your marketplace fee and recipient, (fee is in BPS)
            // Note that this impacts orders created on your marketplace (offers/listings)
            // marketplaceFee: 250,
            // marketplaceFeeRecipient: "0xabc"
          }}
          theme={reservoirKitTheme}
        >
          <CartProvider>
            <Tooltip.Provider>
              <RainbowKitProvider
                chains={chains}
                theme={rainbowKitTheme}
                modalSize="compact"
              >
                <ToastContextProvider>
                <WalletChatProvider>
                    <FunctionalComponent {...pageProps} />

                    <WagmiConfig client={wagmiClient}>
                      <RainbowKitAuthenticationProvider
                        adapter={authenticationAdapter}
                        status={authStatus}
                      >
                        <RainbowKitProvider chains={chains}>
                          <Component {...pageProps} />
                        </RainbowKitProvider>
                      </RainbowKitAuthenticationProvider>
                    </WagmiConfig>

                    <WalletChatWidget
                      connectedWallet={
                        address && activeConnector && chainId
                          ? {
                              walletName: activeConnector.name,
                              account: address,
                              chainId: chain.id,
                            }
                          : undefined
                      }
                      signedMessageData={
                        signedMessage && messageSignature
                          ? {
                              signature: messageSignature,
                              signedMsg: signedMessage,
                            }
                          : undefined
                      }
                      //signMessage={signMessageAsync}
                    />
                  </WalletChatProvider>
                </ToastContextProvider>
              </RainbowKitProvider>
            </Tooltip.Provider>
          </CartProvider>
        </ReservoirKitProvider>
      </ThemeProvider>
    </HotkeysProvider>
  )
}

AppWrapper.getInitialProps = async (appContext: AppContext) => {
  // calls page's `getInitialProps` and fills `appProps.pageProps`
  const appProps = await NextApp.getInitialProps(appContext)
  let baseUrl = ''

  if (appContext.ctx.req?.headers.host) {
    const host = appContext.ctx.req?.headers.host
    baseUrl = `${host.includes('localhost') ? 'http' : 'https'}://${host}`
  } else if (process.env.NEXT_PUBLIC_HOST_URL) {
    baseUrl = process.env.NEXT_PUBLIC_HOST_URL || ''
  }
  baseUrl = baseUrl.replace(/\/$/, '')

  return { ...appProps, baseUrl }
}

export default AppWrapper
