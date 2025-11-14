-- I Don't Have Spotify Action
-- Convert music links across streaming platforms
-- API: http://idonthavespotify.sjdonado.com

local toast = require 'lib.toast'
local events = require 'lib.events'
local icons = require 'lib.icons'
local chooserManager = require 'lib.chooser'

-- API Configuration
local API_BASE = 'https://idonthavespotify.sjdonado.com'
local API_VERSION = '1'

local logger = hs.logger.new('IDontHaveSpotify', 'debug')

local PLATFORM_NAMES = {
  spotify = 'Spotify',
  youTube = 'YouTube',
  appleMusic = 'Apple Music',
  deezer = 'Deezer',
  soundCloud = 'SoundCloud',
  tidal = 'Tidal',
}

-- Store last query data to persist in-memory across invocations
local lastQuery = {
  link = nil,
  results = {},
  songInfo = nil,
}

return {
  {
    id = 'idonthavespotify',
    name = 'IDHS Convert Music Link',
    icon = 'idonthavespotify/icon.png',
    description = 'Convert music links across streaming platforms',
    handler = function()
      local actionsLauncher = spoon.ActionsLauncher

      -- Get link from clipboard
      local link = hs.pasteboard.getContents()
      local hasValidLink = link and link ~= '' and string.match(link, '^https?://')

      local results = {}
      local loading = false
      local songInfo = nil
      local queryLink = nil

      -- If no valid link, use last query data
      if not hasValidLink then
        if lastQuery.link and #lastQuery.results > 0 then
          queryLink = lastQuery.link
          results = lastQuery.results
          songInfo = lastQuery.songInfo
        end
      else
        -- Valid link found, start loading
        queryLink = link
        loading = true
      end

      actionsLauncher:openChildChooser {
        placeholder = hasValidLink and 'Converting music link...' or "I Don't Have Spotify",
        parentAction = 'idonthavespotify',
        initialQuery = queryLink or '',
        handler = function(query, launcher)
          if loading then
            return {
              {
                text = 'Converting...',
                subText = 'Fetching from ' .. API_BASE,
                uuid = launcher:generateUUID(),
              },
            }
          end

          -- If no results at all, show helpful message
          if #results == 0 then
            return {
              {
                text = 'No music links available',
                subText = 'Copy a music link to clipboard and try again',
                uuid = launcher:generateUUID(),
              },
            }
          end

          -- Build results using buildChoices (no search needed)
          return events.buildChoices(results, launcher, {
            image = icons.getIcon(icons.preset.music),
            handler = function(result)
              return events.openUrl(function()
                return result.url
              end)
            end,
          })
        end,
      }

      -- Make API request only if we have a valid link
      if hasValidLink then
        local url = string.format('%s/api/search?v=%s', API_BASE, API_VERSION)
        local payload = hs.json.encode { link = link }

        hs.http.asyncPost(url, payload, { ['Content-Type'] = 'application/json' }, function(status, body, headers)
          loading = false

          if status == 200 then
            local success, data = pcall(function()
              return hs.json.decode(body)
            end)

            if success and data and data.links then
              -- Store song info
              songInfo = {
                title = data.title,
                type = data.type,
                description = data.description,
                image = data.image,
              }

              -- Clear previous results
              results = {}

              -- Add universal link as first option if available
              if data.universalLink then
                table.insert(results, {
                  text = 'Universal Link (Share All)',
                  subText = data.universalLink,
                  url = data.universalLink,
                  platformType = 'universal',
                })
              end

              -- Process platform-specific links
              for _, linkData in ipairs(data.links) do
                if not linkData.notAvailable then
                  local platformName = PLATFORM_NAMES[linkData.type] or linkData.type
                  local verified = linkData.isVerified and ' ✓' or ''

                  table.insert(results, {
                    text = string.format('%s%s', platformName, verified),
                    subText = linkData.url,
                    url = linkData.url,
                    platformType = linkData.type,
                  })
                end
              end

              lastQuery = {
                link = link,
                results = results,
                songInfo = songInfo,
              }

              actionsLauncher:refresh()
            else
              logger.e('Failed to parse API response: ' .. tostring(body))
              toast.error 'Failed to parse API response'
            end
          elseif status == 429 then
            local errorData = hs.json.decode(body) or {}
            local retryAfter = errorData.retryAfter or 60
            logger.w(string.format('Rate limited. Retry after %d seconds', retryAfter))
            toast.error(string.format('Rate limited. Retry after %d seconds', retryAfter))
          else
            local errorData = hs.json.decode(body) or {}
            local errorMsg = errorData.error or 'Unknown error'
            logger.e(string.format('API error %d: %s', status, errorMsg))
            toast.error(string.format('API error: %s', errorMsg))
          end
        end)
      end
    end,
  },
}
